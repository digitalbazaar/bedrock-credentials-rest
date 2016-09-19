/*
 * Copyright (c) 2016 Digital Bazaar, Inc. All rights reserved.
 */
 /* globals describe, before, after, it, should, beforeEach */
 /* jshint node: true */
'use strict';

var _ = require('lodash');
var async = require('async');
var bedrock = require('bedrock');
var config = bedrock.config;
var helpers = require('./helpers');
var mockData = require('./mock.data');
var store = require('bedrock-credentials-mongodb').provider;
var uuid = require('uuid').v4;
var url = require('url');
var util = bedrock.util;
var request = require('request');
request = request.defaults({json: true, strictSSL: false});

var urlObj = {
  protocol: 'https',
  host: config.server.host,
  pathname: config['credentials-rest'].basePath
};

describe('bedrock-credentials-rest queries', function() {
  before('Prepare the database', function(done) {
    helpers.prepareDatabase(mockData, done);
  });
  after('Remove test data', function(done) {
    helpers.removeCollections(done);
  });
  beforeEach('Erase credentials', function(done) {
    helpers.removeCollection('credentialProvider', done);
  });
  describe('authenticated requests with no URL parameters', function() {
    // Regular users should only have access to their own credentials
    describe('regular user', function() {
      var user = mockData.identities.regularUser;

      it('returns empty array if no credentials for user', function(done) {
        paramTest({count: 10, expectCount: 0, user: user}, done);
      });
      it('returns one credential issued to regular user', function(done) {
        paramTest({
          param: 'subject', value: user.identity.id, count: 1, user: user
        }, done);
      });
      it('returns three credentials issued to regular user', function(done) {
        paramTest({
          param: 'subject', value: user.identity.id, count: 3, user: user
        }, done);
      });
      it('returns ten credentials issued to regular user', function(done) {
        paramTest({
          param: 'subject', value: user.identity.id, count: 10, user: user
        }, done);
      });
      it('does not return credentials issued to other users', function(done) {
        paramTest({count: 0, user: user}, done);
      });
    }); // regular user

    describe('admin user', function() {
      var user = mockData.identities.adminUser;

      it('returns empty array if no credentials', function(done) {
        paramTest({count: 0, user: user, control: {insert: false}}, done);
      });
      it('returns one credential issued to a random user', function(done) {
        paramTest({count: 1, user: user, control: {insert: false}}, done);
      });
      it('returns three credentials issued to a random users', function(done) {
        paramTest({count: 3, user: user, control: {insert: false}}, done);
      });
      it('returns ten credentials issued to a random users', function(done) {
        paramTest({count: 10, user: user, control: {insert: false}}, done);
      });
    }); // admin user
  }); // authenticated requests with no URL params
  describe('authenticated requests with URL params', function() {
    describe('admin user', function() {
      var user = mockData.identities.adminUser;

      describe('filter parameter includes "limit"', function() {
        it('returns ten credentials', function(done) {
          paramTest({
            count: 15, expectCount: 10, param: 'limit', value: '10', user: user,
            control: {insert: false}
          }, done);
        });
        it('returns fifteen credentials', function(done) {
          paramTest({
            count: 25, expectCount: 15, param: 'limit', value: '15', user: user,
            control: {insert: false}
          }, done);
        });
        it('returns twenty-four claimed credentials', function(done) {
          paramTest({
            count: 35, expectCount: 24, param: 'limit', value: '24', user: user,
            control: {insert: false}
          }, done);
        });
      }); // filter parameter includes "claimed"

      describe('filter parameter includes "claimed"', function() {
        it('returns a single claimed credential', function(done) {
          paramTest({
            count: 1, param: 'filter', value: 'claimed', user: user
          }, done);
        });
        it('returns three claimed credentials', function(done) {
          paramTest({
            count: 3, param: 'filter', value: 'claimed', user: user
          }, done);
        });
        it('returns ten claimed credentials', function(done) {
          paramTest({
            count: 10, param: 'filter', value: 'claimed', user: user
          }, done);
        });
      }); // filter parameter includes "claimed"
      describe('filter parameter includes "unclaimed"', function() {
        it('returns a single unclaimed credential', function(done) {
          paramTest({
            count: 1, param: 'filter', value: 'unclaimed', user: user
          }, done);
        });
        it('returns three unclaimed credentials', function(done) {
          paramTest({
            count: 3, param: 'filter', value: 'unclaimed', user: user
          }, done);
        });
        it('returns ten unclaimed credentials', function(done) {
          paramTest({
            count: 10, param: 'filter', value: 'unclaimed', user: user
          }, done);
        });
      }); // filter parameter includes "unclaimed"
      describe('query includes issuer', function() {
        it('returns a single credential', function(done) {
          paramTest({count: 1, param: 'issuer', user: user}, done);
        });
        it('returns a three credentials', function(done) {
          paramTest({count: 3, param: 'issuer', user: user}, done);
        });
        it('returns ten credentials', function(done) {
          paramTest({count: 10, param: 'issuer', user: user}, done);
        });
      }); // query includes issuer
      describe('query includes sort', function() {
        it('returns credentials sorted by issuer(asc)', function(done) {
          async.auto({
            insert: function(callback) {
              insertCredentials({count: 21}, callback);
            },
            query: ['insert', function(callback, results) {
              var clonedUrlObj = util.clone(urlObj);
              clonedUrlObj.query = {
                sort: 'issuer'
              };
              request.get(
                helpers.createHttpSignatureRequest(
                  url.format(clonedUrlObj), user),
                function(err, res, body) {
                  should.not.exist(err);
                  should.exist(body);
                  body.should.be.an('array');
                  body.should.have.length(21);
                  _.map(body, 'issuer')
                    .should.deep.equal(results.insert.issuers.sort());
                  callback();
                });
            }]
          }, done);
        });
        it('returns credentials sorted by issuer(desc)', function(done) {
          async.auto({
            insert: function(callback) {
              insertCredentials({count: 21}, callback);
            },
            query: ['insert', function(callback, results) {
              var clonedUrlObj = util.clone(urlObj);
              clonedUrlObj.query = {
                sort: ['-issuer']
              };
              request.get(
                helpers.createHttpSignatureRequest(
                  url.format(clonedUrlObj), user),
                function(err, res, body) {
                  should.not.exist(err);
                  should.exist(body);
                  body.should.be.an('array');
                  body.should.have.length(21);
                  _.map(body, 'issuer')
                    .should.deep.equal(
                      results.insert.issuers.sort().reverse());
                  callback();
                });
            }]
          }, done);
        });
        it('returns credentials sorted by subject(asc)', function(done) {
          async.auto({
            insert: function(callback) {
              insertCredentials({count: 21}, callback);
            },
            query: ['insert', function(callback, results) {
              var clonedUrlObj = util.clone(urlObj);
              clonedUrlObj.query = {
                sort: 'subject'
              };
              request.get(
                helpers.createHttpSignatureRequest(
                  url.format(clonedUrlObj), user),
                function(err, res, body) {
                  should.not.exist(err);
                  should.exist(body);
                  body.should.be.an('array');
                  body.should.have.length(21);
                  _.map(body, 'claim.id')
                    .should.deep.equal(results.insert.subjects.sort());
                  callback();
                });
            }]
          }, done);
        });
        it('returns credentials sorted by subject(desc)', function(done) {
          async.auto({
            insert: function(callback) {
              insertCredentials({count: 21}, callback);
            },
            query: ['insert', function(callback, results) {
              var clonedUrlObj = util.clone(urlObj);
              clonedUrlObj.query = {
                sort: ['-subject']
              };
              request.get(
                helpers.createHttpSignatureRequest(
                  url.format(clonedUrlObj), user),
                function(err, res, body) {
                  should.not.exist(err);
                  should.exist(body);
                  body.should.be.an('array');
                  body.should.have.length(21);
                  _.map(body, 'claim.id')
                    .should.deep.equal(
                      results.insert.subjects.sort().reverse());
                  callback();
                });
            }]
          }, done);
        });
        it('returns credentials sorted by issued(asc)', function(done) {
          async.auto({
            insert: function(callback) {
              insertCredentials({count: 21}, callback);
            },
            query: ['insert', function(callback, results) {
              var clonedUrlObj = util.clone(urlObj);
              clonedUrlObj.query = {
                sort: 'issued'
              };
              request.get(
                helpers.createHttpSignatureRequest(
                  url.format(clonedUrlObj), user),
                function(err, res, body) {
                  should.not.exist(err);
                  should.exist(body);
                  body.should.be.an('array');
                  body.should.have.length(21);
                  _.map(body, 'issued')
                    .should.deep.equal(results.insert.issuedDates.sort());
                  callback();
                });
            }]
          }, done);
        });
        it('returns credentials sorted by issued(desc)', function(done) {
          async.auto({
            insert: function(callback) {
              insertCredentials({count: 21}, callback);
            },
            query: ['insert', function(callback, results) {
              var clonedUrlObj = util.clone(urlObj);
              clonedUrlObj.query = {
                sort: ['-issued']
              };
              request.get(
                helpers.createHttpSignatureRequest(
                  url.format(clonedUrlObj), user),
                function(err, res, body) {
                  should.not.exist(err);
                  should.exist(body);
                  body.should.be.an('array');
                  body.should.have.length(21);
                  _.map(body, 'issued')
                    .should.deep.equal(
                      results.insert.issuedDates.sort().reverse());
                  callback();
                });
            }]
          }, done);
        });
      }); // query includes sort
      describe('query includes issuer and claimed', function() {
        it('returns a single credential', function(done) {
          var testIssuer = uuid();
          async.auto({
            insert: function(callback) {
              async.parallel([
                function(callback) {
                  insertCredentials({
                    sysState: 'claimed', issuer: testIssuer
                  }, callback);
                },
                function(callback) {
                  // unclaimed with the same issuer
                  insertCredentials({count: 5, issuer: testIssuer}, callback);
                },
                function(callback) {
                  // claimed with the random issuers
                  insertCredentials({count: 15, sysState: 'claimed'}, callback);
                }
              ], callback);
            },
            query: ['insert', function(callback) {
              var clonedUrlObj = util.clone(urlObj);
              clonedUrlObj.query = {
                filter: 'claimed',
                issuer: testIssuer
              };
              request.get(
                helpers.createHttpSignatureRequest(
                  url.format(clonedUrlObj), user),
                function(err, res, body) {
                  should.not.exist(err);
                  should.exist(body);
                  body.should.be.an('array');
                  body.should.have.length(1);
                  callback();
                });
            }]
          }, done);
        });
        it('returns three credentials', function(done) {
          var testIssuer = uuid();
          async.auto({
            insert: function(callback) {
              async.parallel([
                function(callback) {
                  insertCredentials({
                    sysState: 'claimed', issuer: testIssuer, count: 3
                  }, callback);
                },
                function(callback) {
                  // unclaimed with the same issuer
                  insertCredentials({count: 5, issuer: testIssuer}, callback);
                },
                function(callback) {
                  // claimed with the random issuers
                  insertCredentials({count: 15, sysState: 'claimed'}, callback);
                }
              ], callback);
            },
            query: ['insert', function(callback) {
              var clonedUrlObj = util.clone(urlObj);
              clonedUrlObj.query = {
                filter: 'claimed',
                issuer: testIssuer
              };
              request.get(
                helpers.createHttpSignatureRequest(
                  url.format(clonedUrlObj), user),
                function(err, res, body) {
                  should.not.exist(err);
                  should.exist(body);
                  body.should.be.an('array');
                  body.should.have.length(3);
                  callback();
                });
            }]
          }, done);
        });
        it('returns ten credentials', function(done) {
          var testIssuer = uuid();
          async.auto({
            insert: function(callback) {
              async.parallel([
                function(callback) {
                  insertCredentials({
                    sysState: 'claimed', issuer: testIssuer, count: 10
                  }, callback);
                },
                function(callback) {
                  // unclaimed with the same issuer
                  insertCredentials({count: 5, issuer: testIssuer}, callback);
                },
                function(callback) {
                  // claimed with the random issuers
                  insertCredentials({count: 15, sysState: 'claimed'}, callback);
                }
              ], callback);
            },
            query: ['insert', function(callback) {
              var clonedUrlObj = util.clone(urlObj);
              clonedUrlObj.query = {
                filter: 'claimed',
                issuer: testIssuer
              };
              request.get(
                helpers.createHttpSignatureRequest(
                  url.format(clonedUrlObj), user),
                function(err, res, body) {
                  should.not.exist(err);
                  should.exist(body);
                  body.should.be.an('array');
                  body.should.have.length(10);
                  callback();
                });
            }]
          }, done);
        });
      }); // query includes issuer and claimed
    }); // admin user
  }); // authenticated requests with URL params
});

function insertCredentials(options, callback) {
  var count;
  if(options.count === 0) {
    count = 0;
  } else {
    count = options.count || 1;
  }
  var testValues = {
    subjects: [],
    issuers: [],
    issuedDates: []
  };
  async.times(count, function(id, callback) {
    // if subject is not specified a random did will be used for each credential
    var subject = options.subject || ('did:' + uuid());
    testValues.subjects.push(subject);
    var credential = createUniqueCredential(subject);
    credential.issuer = options.issuer || ('did:' + uuid());
    testValues.issuers.push(credential.issuer);
    credential.sysState = options.sysState || 'unclaimed';
    credential.issued =
      helpers.randomDate(new Date(2012,0,1), new Date()).toJSON();
    testValues.issuedDates.push(credential.issued);
    store.insert(null, credential, callback);
  }, function(err) {
    if(err) {
      return callback(err);
    }
    callback(null, testValues);
  });
}

function createUniqueCredential(subject) {
  var testBaseUri = 'https://example.com/credentials/';
  var newCredential = util.clone(mockData.credentialTemplate);
  newCredential.id = testBaseUri + uuid();
  newCredential.claim.id = subject;
  return newCredential;
}

function paramTest(options, callback) {
  var testValue = options.value || uuid();
  var count = options.count || 0;
  var expectCount;
  if(options.expectCount === 0) {
    expectCount = 0;
  } else {
    expectCount = options.expectCount || count;
  }
  var controlOptions = {};
  _.assign(controlOptions, {insert: true, count: 15}, options.control);
  var testOptions = {
    count: count
  };
  async.auto({
    insert: function(callback) {
      if(options.param !== 'filter') {
        testOptions[options.param] = testValue;
      } else {
        var paramObj = {
          claimed: {
            test: {sysState: 'claimed'},
            control: {sysState: 'unclaimed'}
          },
          unclaimed: {
            test: {sysState: 'unclaimed'},
            control: {sysState: 'claimed'}
          }
        };
        var filterParams = [].concat(testValue);
        filterParams.forEach(function(param) {
          if(param in paramObj) {
            _.assign(testOptions, paramObj[param].test);
            _.assign(controlOptions, paramObj[param].control);
          }
        });
      }
      async.parallel([
        function(callback) {
          insertCredentials(testOptions, callback);
        },
        function(callback) {
          // control group
          if(!controlOptions.insert) {
            return callback();
          }
          insertCredentials(controlOptions, callback);
        }
      ], callback);
    },
    query: ['insert', function(callback) {
      var clonedUrlObj = util.clone(urlObj);
      clonedUrlObj.query = {};
      clonedUrlObj.query[options.param] = testValue;
      request.get(
        helpers.createHttpSignatureRequest(
          url.format(clonedUrlObj), options.user),
        function(err, res, body) {
          should.not.exist(err);
          should.exist(body);
          body.should.be.an('array');
          body.should.have.length(expectCount);
          callback();
        });
    }]
  }, callback);
}
