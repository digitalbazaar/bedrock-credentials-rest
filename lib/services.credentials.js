/*
 * Copyright (c) 2012-2016 Digital Bazaar, Inc. All rights reserved.
 */
/* jshint node:true */
'use strict';

var _ = require('lodash');
var async = require('async');
var bedrock = require('bedrock');
var brPassport = require('bedrock-passport');
var brPermission = require('bedrock-permission');
var credentialsRest = require('./api');
var config = bedrock.config;
var cors = require('cors');
var database = require('bedrock-mongodb');
var docs = require('bedrock-docs');
var rest = require('bedrock-rest');
var ensureAuthenticated = brPassport.ensureAuthenticated;
var optionallyAuthenticated = brPassport.optionallyAuthenticated;
var store = require('bedrock-credentials-mongodb').provider;
var validate = require('bedrock-validation').validate;
var BedrockError = bedrock.util.BedrockError;

var logger = bedrock.loggers.get('app');

// module permissions
var PERMISSIONS = bedrock.config.permission.permissions;

// add routes
bedrock.events.on('bedrock-express.configure.routes', function(app) {
  app.param('credential', rest.idParam);
  var basePath = config['credentials-rest'].basePath;

  // FIXME: handle updates, allow use by issuer
  // - Share code with /credentials/:credential POST handler
  //app.post(basePath,
  //  ensureAuthenticated,
  //  validate('services.credentials-rest.postCredentials'),
  //  function(req, res, next) {
  //    // ...
  //  });

  // FIXME: add CORS and access control support
  app.get(
    basePath, rest.when.prefers.jsonld, optionallyAuthenticated,
    rest.linkedDataHandler({
      /* FIXME
      validate: {
        query: 'services.credentials-rest.getCredentialsQuery'
      },
      */
      get: function(req, res, callback) {
        var query = {};
        var count = '';
        // default to non-deleted credentials
        query['credential.sysStatus'] = {$ne: 'deleted'};
        if(req.query.id) {
          query['credential.id'] = req.query.id;
        }
        if(req.query.count) {
          count = req.query.count;
        }
        // FIXME: default query recipient to req.user.identity.id?
        if(req.query.recipient) {
          // FIXME: there could be multiple x specified in array
          query.recipient = database.hash(req.query.recipient);
        }
        if(req.query.subject) {
          // FIXME: there could be multiple x specified in array
          query.recipient = database.hash(req.query.subject);
        }
        if(req.query.issuer) {
          // FIXME: there could be multiple x specified in array
          query.issuer = database.hash(req.query.issuer);
        }
        if(req.query.issued) {
          var startDate = new Date(req.query.issued);
          var endDate = new Date(req.query.issued);
          endDate.setDate(endDate.getDate() + 1);
          query['credential.issued'] = {
            $gte: startDate.toJSON(),
            $lt: endDate.toJSON()
          };
        }
        if(req.query.filter) {
          var paramObj = {
            claimed: {'credential.sysState': 'claimed'},
            unclaimed: {'credential.sysState': 'unclaimed'}
          };
          var customParams = [].concat(req.query.filter);
          customParams.forEach(function(param) {
            if(param in paramObj) {
              _.assign(query, paramObj[param]);
            }
          });
        }
        var sortOptions = {sort: []};
        if(req.query.sort) {
          var sortFieldMap = {
            issuer: 'credential.issuer',
            subject: 'credential.claim.id',
            issued: 'credential.issued'
          };
          // req.query.sort could be a string or an array
          var sortParams = [].concat(req.query.sort);
          sortOptions.sort.push(sortParams.reduce(function(a, field) {
            // determine direction of sort
            // default is ascending which can also be specified with `+field`
            var direction = 'asc';
            if(field.indexOf('+') === 0) {
              field = field.substr(1);
            } else if(field.indexOf('-') === 0) {
              direction = 'desc';
              field = field.substr(1);
            }
            // if field can be mapped to a mongo field, use it
            if(field in sortFieldMap) {
              return a.concat([sortFieldMap[field], direction]);
            }
            // otherwise discard it
            return a;
          }, []));
        }
        var actor; // default value should be undefined, not null
        if(req.user && req.user.identity) {
          actor = req.user.identity;
        }
        var options = {};
        if(req.query.limit > 0) {
          options.limit = Number(req.query.limit);
        }
        if(req.query.offset > 0) {
          options.skip = Number(req.query.offset);
        }
        if(sortOptions.sort.length > 0) {
          _.assign(options, sortOptions);
        }
        // just return the record count
        if(count === 'only') {
          return store.count(actor, query, options, callback);
        }
        return store.getAll(actor, query, {}, options, function(err, records) {
          if(err) {
            return callback(err);
          }
          if(req.query.id) {
            if(records.length === 0) {
              return callback(new BedrockError(
                'Credential not found.', 'NotFound', {
                  public: true,
                  httpStatusCode: 404
                }));
            }
            // sysIsPublic is used in the view to manage public properties
            var credential = records[0].credential;
            if(credential.sysPublic) {
              delete credential.sysPublic;
              credential.sysIsPublic = true;
            }
            return callback(null, credential);
          }
          async.map(records, function(record, callback) {
            _credentialToFormat(
              record.credential, record.meta, req.query.format, callback);
          }, callback);
        });
      }
    }));

  // update credential where credential is specified via ?id=foo
  app.post(basePath, ensureAuthenticated, function(req, res, next) {
    if(!req.query.id) {
      return next('route');
    }
    req.bedrock = req.bedrock || {};
    // get ID from query
    req.bedrock.credentialId = req.query.id;
    next();
  }, updateCredential);

  // FIXME: this endpoint should be enabled/disabled via configuration
  app.post(
    basePath + '/:credential', ensureAuthenticated,
    validate('services.credentials-rest.postCredential'),
    function(req, res, next) {
      req.bedrock = req.bedrock || {};
      // get ID from URL
      req.bedrock.credentialId = config.server.baseUri + basePath + '/' +
        req.params.credential;
      next();
    }, updateCredential);
  docs.annotate.post(basePath + '/:credential', {
    description: 'Modify an existing credential.',
    securedBy: ['cookie', 'hs1'],
    schema: 'services.credentials-rest.postCredential',
    responses: {
      200: 'The credential was revoked successfully.',
      204: 'The credential was updated successfully.',
      400: 'The credential could not be modified.'
    }
  });

  app.options(basePath + '/:credential', cors());
  app.get(basePath + '/:credential',
    cors(), optionallyAuthenticated, rest.makeResourceHandler({
      validate: {
        query: 'services.credentials-rest.getCredentialQuery'
      },
      get: function(req, res, callback) {
        _getCredentialRecord(req, res, function(err, record) {
          if(err) {
            return callback(err);
          }
          // FIXME: handle format conversion for partial credentials
          return _credentialToFormat(
            record.credential, record.meta, req.query.format, callback);
        });
      }
    }));

  // helper function to get optionallyAuthenticated credential record
  // @param callback(err, {credential:...,meta:...})
  function _getCredentialRecord(req, res, callback) {
    var credentialId =
      credentialsRest.createCredentialId(req.params.credential);
    // What type of data to return:
    // F=full P=partial E=error
    // sess/no-sess
    //                actor-has-perm  actor-no-perm     none
    // public         F/-             F/-               -/F
    // partial-public F/-             P/-               -/P
    // private        F/-             E/-               -/E
    // FIXME: no actor used when getting credential
    var actor = (req.user && req.user.identity) ? req.user.identity : null;
    async.auto({
      record: function(callback, results) {
        // FIXME: improve how full/partial public credentials are handled
        logger.warning('FIXME: no actor used when getting credential');
        store.get(null, credentialId, function(
          err, credential, meta) {
          callback(err, {
            credential: credential,
            meta: meta
          });
        });
      },
      admin: ['record', function(callback) {
        if(actor) {
          brPermission.checkPermission(
            actor, PERMISSIONS.CREDENTIAL_ADMIN, function(err) {
              // if err then permission is denied
              var pass = err ? false : true;
              callback(null, pass);
            });
        }
        callback(null, false);
      }],
      issuer: ['record', function(callback, results) {
        if(actor) {
          var issuer = results.record.credential.issuer;
          return callback(null, issuer === actor.id);
        }
        callback(null, false);
      }],
      subject: ['record', function(callback, results) {
        if(actor) {
          var subject = results.record.credential.claim.id;
          return callback(null, subject === actor.id);
        }
        callback(null, false);
      }],
      filteredCredential: ['admin', 'record', 'issuer', 'subject',
        function(callback, results) {
        var credential = results.record.credential;
        if(results.issuer || results.subject || results.admin) {
          return callback(null, credential);
        }
        var allPublic =
          bedrock.jsonld.hasValue(credential, 'sysPublic', '*');
        if(allPublic) {
          // remove visibility details
          delete credential.sysPublic;
          // add in flag to know this is public credential data
          // FIXME: better way to convey this meta info?
          credential.sysIsPublic = true;
          return callback(null, credential);
        }
        // FIXME: add partial field support
        //if(partial) {
        //  // remove visibility details
        //  delete credential.sysPublic;
        //  // remove signature if not all signed properties are present
        //  //delete credential.signature;
        //  // add in flag to know this is public credential data
        //  credential.sysIsPublic = true;
        //  ... keep only fields listed in sysPublic ...
        //}
        return callback(new BedrockError(
          'Credential not found.', 'NotFound',
          {'public': true, httpStatusCode: 404}));
      }]
    }, function(err, results) {
      if(err) {
        return callback(err);
      }
      callback(null, {
        credential: results.filteredCredential,
        meta: results.record.meta
      });
    });
  }

  /*
  app.delete(basePath + '/:credential',
    ensureAuthenticated,
    function(req, res, next) {
      // FIXME: createIdentityId moved to bedrock-idp
      var identityId = brIdentity.createIdentityId(req.params.identity);
      var credentialId = ....createCredentialId(
        identityId, req.params.credential);
      store.remove(
        req.user.identity, credentialId, function(err) {
        if(err) {
          return next(err);
        }
        res.sendStatus(204);
      });
    });
  */
});

function noop() {}

/**
 * Convert a Credential to another format.
 *
 * @param credential the native credential to convert.
 * @param meta the credential meta data.
 * @param format the format to convert to.
 * @param callback(err, credential) called with an error or the result.
 */
function _credentialToFormat(credential, meta, format, callback) {
  // FIXME
  // look up in formatters config
  // process with func or array of funcs if found
  // else
  return callback(null, credential);
}

function updateCredential(req, res, next) {
  // check id matches
  if(req.body.id !== req.bedrock.credentialId) {
    return next(new BedrockError(
      'Credential ID mismatch.', 'CredentialIdMismatch',
      {httpStatusCode: 409, 'public': true}));
  }
  var credentialId = req.body.id;

  var updateQuery = {
    'credential.id': credentialId
  };
  var updateParams = {};
  var credentialEvent;

  // TODO: enable/disable revocation via config
  if('revoked' in req.body) {
    /*
    var now = Date.now();
    // TODO: any other meta to include?
    // TODO: include reason
    // TODO: resign credential if appropriate
    updateParams.$set = {
      'credential.sysState': 'revoked',
      'meta.updated': now
    };*/
    credentialEvent = 'CredentialRevoke';
    logger.warning('TODO: Implement credential revocation.');
    return next(new BedrockError(
      'Credential revocation not implemented.', 'NotImplemented',
      {httpStatusCode: 400, 'public': true}));
  } else if(req.body.sysState === 'claimed' ||
    req.body.sysState === 'rejected') {
    credentialEvent = (req.body.sysState === 'claimed' ?
      'CredentialClaim' : 'CredentialReject');
    // specify sysState: unclaimed to prevent duplicate
    // provenance/logging events
    updateQuery['credential.sysState'] = 'unclaimed';
    var now = Date.now();
    updateParams.$set = {
      'credential.sysState': req.body.sysState,
      'meta.updated': now,
      'meta.acceptance': {
        status: (req.body.sysState === 'claimed' ? 'accepted' : 'rejected'),
        date: now
      }
    };
  } else if(req.body.sysPublic) {
    updateParams.$set = {'meta.updated': Date.now()};
    if(req.body.sysPublic.length === 0) {
      credentialEvent = 'CredentialConceal';
      updateParams.$unset = {'credential.sysPublic': ''};
    } else {
      credentialEvent = 'CredentialReveal';
      updateParams.$set['credential.sysPublic'] = req.body.sysPublic;
    }
  } else {
    // TODO: allow other operations?
    return next(new BedrockError(
      'Invalid update operation.', 'InvalidUpdateOperation',
      {httpStatusCode: 400, 'public': true}));
  }

  async.auto({
    updateCredential: function(callback) {
      store.collection.update(
        updateQuery, updateParams, callback);
    },
    checkUpdate: ['updateCredential', function(callback, results) {
      if(results.updateCredential.result.nModified !== 1) {
        return callback(new BedrockError(
          'Credential not found.',
          'NotFound', {
            credentialId: credentialId
          }));
      }
      callback();
    }],
    logEvent: ['checkUpdate', function(callback) {
      var eventTypes = config['event-log'].eventTypes;
      if(!('ensureWriteSuccess' in eventTypes[credentialEvent])) {
        eventTypes[credentialEvent].ensureWriteSuccess = true;
      }
      // if ensureWriteSuccess is false, execute callback and proceed
      if(!eventTypes[credentialEvent].ensureWriteSuccess) {
        callback();  // no return here
        callback = noop;
      }
      async.auto({
        getCredential: function(callback) {
          store.get(req.user.identity, credentialId, callback);
        },
        emit: ['getCredential', function(callback, results) {
          bedrock.events.emit(
            'bedrock-credentials-rest.credential.' + credentialEvent, {
            type: credentialEvent,
            date: new Date().toJSON(),
            resource: [credentialId],
            issuer: results.getCredential[0].issuer,
            actor: req.user.identity.id
          }, callback);
        }]
      }, callback);
    }]
  }, function(err) {
    if(err) {
      return next(new BedrockError(
        'The credential could not be updated.',
        'UpdateCredentialFailed', {
          httpStatusCode: 400,
          'public': true
        }, err));
    }
    return res.sendStatus(204);
  });
}
