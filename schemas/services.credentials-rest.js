/*
 * Copyright (c) 2014-2015 Digital Bazaar, Inc. All rights reserved.
 */
var constants = require('bedrock').config.constants;
var validation = require('bedrock-validation');
var schemas = validation.schemas;

var postCredentials = schemas.credential({
  title: 'POST credentials',
  additionalProperties: false
});

var getCredentialsQuery = {
  type: 'object',
  title: 'GET credentials query',
  properties: {
    // FIXME: support filters
  }
};

var postCredential = {
  type: 'object',
  title: 'POST credential',
  properties: {
    '@context': schemas.jsonldContext(constants.IDENTITY_CONTEXT_V1_URL),
    id: schemas.identifier(),
    sysState: {
      required: false,
      title: 'Credential state',
      description: 'The state to set on the credential.',
      type: 'string',
      enum: ['claimed', 'rejected']
    },
    revoked: {
      required: false
    },
    sysPublic: {
      required: false,
      title: 'Credential visibility.',
      description: 'A list of property IRIs that are publicly visible.',
      type: 'array',
      uniqueItems: true,
      items: {
        type: 'string',
        enum: [
          '*'
        ]
      },
      errors: {
        invalid: 'Only "*" (all) or no values are permitted.',
        missing: 'Please enter the properties that should be publicly visible.'
      }
    }
  },
  additionalProperties: false
};

var getCredentialQuery = {
  type: 'object',
  title: 'GET credential query',
  properties: {
    // FIXME: support filters
  }
};

module.exports.postCredentials = function() {
  return postCredentials;
};
module.exports.getCredentialsQuery = function() {
  return getCredentialsQuery;
};
module.exports.postCredential = function() {
  return postCredential;
};
module.exports.getCredentialQuery = function() {
  return getCredentialQuery;
};
