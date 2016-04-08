/*
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 */
 /* jshint node: true */

 'use strict';

var _ = require('lodash');
var async = require('async');
var bedrock = require('bedrock');
var brKey = require('bedrock-key');
var brIdentity = require('bedrock-identity');
var config = require('bedrock').config;
// var mockData = require('./mock.data');
var uuid = require('node-uuid').v4;
var util = bedrock.util;
var database = require('bedrock-mongodb');

var api = {};
module.exports = api;

api.createHttpSignatureRequest = function(url, identity) {
  var newRequest = {
    url: url,
    httpSignature: {
      key: identity.keys.privateKey.privateKeyPem,
      keyId: identity.keys.publicKey.id,
      headers: ['date', 'host', 'request-line']
    }
  };
  return newRequest;
};

api.createIdentity = function(userName) {
  var newIdentity = {
    id: 'did:' + uuid(),
    type: 'Identity',
    sysSlug: userName,
    label: userName,
    email: userName + '@bedrock.dev',
    sysPassword: 'password',
    sysPublic: ['label', 'url', 'description'],
    sysResourceRole: [],
    url: config.server.baseUri,
    description: userName,
    sysStatus: 'active'
  };
  return newIdentity;
};

api.createKeyPair = function(options) {
  var userName = options.userName;
  var publicKey = options.publicKey;
  var privateKey = options.privateKey;
  var ownerId = null;
  if(userName === 'userUnknown') {
    ownerId = '';
  } else {
    ownerId = options.userId;
  }
  var newKeyPair = {
    publicKey: {
      '@context': 'https://w3id.org/identity/v1',
      id: ownerId + '/keys/1',
      type: 'CryptographicKey',
      owner: ownerId,
      label: 'Signing Key 1',
      publicKeyPem: publicKey
    },
    privateKey: {
      type: 'CryptographicKey',
      owner: ownerId,
      label: 'Signing Key 1',
      publicKey: ownerId + '/keys/1',
      privateKeyPem: privateKey
    }
  };
  return newKeyPair;
};

api.prepareDatabase = function(mockData, callback) {
  async.series([
    function(callback) {
      api.removeCollections(callback);
    },
    function(callback) {
      insertTestData(mockData, callback);
    }
  ], callback);
};

api.randomDate = function(start, end) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

api.removeCollections = function(callback) {
  var collectionNames =
    ['credentialProvider', 'identity', 'publicKey', 'eventLog'];
  database.openCollections(collectionNames, function(err) {
    async.each(collectionNames, function(collectionName, callback) {
      database.collections[collectionName].remove({}, callback);
    }, function(err) {
      callback(err);
    });
  });
};

api.removeCollection = function(collection, callback) {
  var collectionNames = [collection];
  database.openCollections(collectionNames, function(err) {
    async.each(collectionNames, function(collectionName, callback) {
      database.collections[collectionName].remove({}, callback);
    }, function(err) {
      callback(err);
    });
  });
};

// Insert identities and public keys used for testing into database
function insertTestData(mockData, callback) {
  async.forEachOf(mockData.identities, function(identity, key, callback) {
    async.parallel([
      function(callback) {
        brIdentity.insert(null, identity.identity, callback);
      },
      function(callback) {
        brKey.addPublicKey(null, identity.keys.publicKey, callback);
      }
    ], callback);
  }, function(err) {
    if(err) {
      if(!database.isDuplicateError(err)) {
        // duplicate error means test data is already loaded
        return callback(err);
      }
    }
    callback();
  }, callback);
}
