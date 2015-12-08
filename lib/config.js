/*
 * Bedrock Credentials REST Module Configuration
 *
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 */
var config = require('bedrock').config;
var path = require('path');

// load modules
require('bedrock-validation');

config['credentials-rest'] = {};
// root of credential endpoints
config['credentials-rest'].basePath = '/credentials';
config['credentials-rest']['event-log'] = {};
config['credentials-rest']['event-log'].enable = false;

// configure event logging module
config['event-log'].eventTypes.CredentialClaim = {
  index: 'issuer',
  ensureWriteSuccess: true
};
config['event-log'].eventTypes.CredentialReject = {
  index: 'issuer',
  ensureWriteSuccess: true
};

// validation
config.validation.schema.paths.push(path.join(__dirname, '..', 'schemas'));
