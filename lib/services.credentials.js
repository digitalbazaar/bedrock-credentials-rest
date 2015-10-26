/*
 * Copyright (c) 2012-2015 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
//var brIdentity = require('bedrock-identity');
var brPassport = require('bedrock-passport');
var credentialsRest = require('./api');
var database = require('bedrock-mongodb');
var cors = require('cors');
var docs = require('bedrock-docs');
var rest = require('bedrock-rest');
var ensureAuthenticated = brPassport.ensureAuthenticated;
var optionallyAuthenticated = brPassport.optionallyAuthenticated;
var store = require('bedrock-credentials-mongodb').provider;
var validate = require('bedrock-validation').validate;
var BedrockError = bedrock.util.BedrockError;

var logger = bedrock.loggers.get('app');

// add routes
bedrock.events.on('bedrock-express.configure.routes', function(app) {
  app.param('credential', rest.idParam);
  var basePath = bedrock.config['credentials-rest'].basePath;

  // FIXME: handle updates, allow use by issuer
  // - Share code with /credentials/:credential POST handler
  //app.post(basePath,
  //  ensureAuthenticated,
  //  validate('services.credentials-rest.postCredentials'),
  //  function(req, res, next) {
  //    // ...
  //  });

  // FIXME: add CORS and access control support
  app.get(basePath,
    ensureAuthenticated,
    rest.makeResourceHandler({
      /* FIXME
      validate: {
        query: 'services.credentials-rest.getCredentialsQuery'
      },
      */
      get: function(req, res, callback) {
        var identityId = req.user.identity.id;
        var idHash = database.hash(identityId);
        var query = {};
        // default to non-deleted offers
        query['credential.sysStatus'] = {$ne: 'deleted'};
        // FIXME: default query recipient to current id?
        if(req.query.recipient) {
          query.recipient = database.hash(req.query.recipient);
        }
        if(req.query.issuer) {
          query.issuer = database.hash(req.query.issuer);
        }
        if(req.query.filter) {
          query['credential.sysState'] = req.query.filter;
        }
        if(req.query.id) {
          // FIXME: use _getCredentialRecord()
          store.get(
            req.user.identity, req.query.id,
            function(err, credential, meta) {
              if(err) {
                return callback(err);
              }
              _credentialToFormat(credential, meta, req.query.format, callback);
            });
        } else {
          // FIXME: use _getCredentialRecord() or similar
          store.getAll(
            req.user.identity, query, {credential: true, meta: true},
            function(err, records) {
              if(err) {
                return callback(err);
              }
              async.map(records, function(record, callback) {
                _credentialToFormat(
                  record.credential, record.meta, req.query.format, callback);
              }, callback);
            });
        }
      }
    }));
  docs.annotate.get(basePath, {
    description: 'Get a list of credentials.',
    securedBy: ['null', 'cookie', 'hs1'],
    responses: {
      200: {
        'application/ld+json': {
          'example': 'examples/get.credentials.jsonld'
        }
      }
    }
  });

  /*
  app.post(basePath + '/:credential',
    ensureAuthenticated,
    validate('services.credentials-rest.postCredential'),
    function(req, res, next) {
      // get ID from URL
      var credentialId = req.params.credential;

      // check id matches
      if(req.body.id !== credentialId) {
        return next(new BedrockError(
          'Credential ID mismatch.', 'CredentialIdMismatch',
          {httpStatusCode: 400, 'public': true}));
      }

      if('revoked' in req.body) {
        // FIXME: revoke credential
        //store....(req.user.identity, req.body, function(err) {
        //  if(err) {
        //    return next(err);
        //  }
        //  res.status(204).end();
        //});
        logger.warning('Implement credential revoking.');
        return next(new BedrockError(
          'Credential revoking not implemented.', 'NotImplemented',
          {httpStatusCode: 400, 'public': true}));
      }

      // FIXME: update credential
      //store....(req.user.identity, req.body, function(err) {
      //  if(err) {
      //    return next(err);
      //  }
      //  res.status(204).end();
      //});
      logger.warning('Implement credential updating.');
      return next(new BedrockError(
        'Credential updating not implemented.', 'NotImplemented',
        {httpStatusCode: 400, 'public': true}));
    });
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
  */

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
    // FIXME
    var actor = (req.user && req.user.identity) ? req.user.identity : null;
    logger.warning('FIXME: no actor used when getting credential');
    actor = null;
    async.auto({
      record: function(callback, results) {
        // FIXME: improve how full/partial public credentials are handled
        store.get(actor, credentialId, function(
          err, credential, meta) {
          callback(err, {
            credential: credential,
            meta: meta
          });
        });
      },
      issuer: ['record', function(callback, results) {
        if(actor) {
          var issuer = results.record.credential.issuer;
          return callback(null, issuer === actor.id);
        }
        callback(null, false);
      }],
      holder: ['record', function(callback, results) {
        if(actor) {
          var holder = results.record.credential.claim.id;
          return callback(null, holder === actor.id);
        }
        callback(null, false);
      }],
      filteredCredential: ['record', 'issuer', 'holder',
        function(callback, results) {
        var credential = results.record.credential;
        // FIXME
        logger.warning('FIXME: skipping get credential perm checks!');
        //if(results.issuer || results.holder) {
        if(true) {
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
          'Not authenticated.', 'PermissionDenied',
          {'public': true, httpStatusCode: 403}));
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
  docs.annotate.get(basePath + '/:credential', {
    description: 'Get a credential.',
    securedBy: ['null', 'cookie', 'hs1'],
    responses: {
      200: {
        'application/ld+json': {
          'example': 'examples/get.identity.keys.publicKey.jsonld'
        }
      }
    }
  });

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
        res.status(204).end();
      });
    });
  */
});

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
