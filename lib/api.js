/*
 * Bedrock Credentials REST module.
 *
 * Copyright (c) 2012-2016 Digital Bazaar, Inc. All rights reserved.
 */
var config = require('bedrock').config;
var util = require('util');
require('bedrock-event-log');
// module API
var api = {};
module.exports = api;

require('./config');
require('./services.credentials');

/**
 * Creates a Credential ID based on server baseUri and a custom name.
 *
 * @param name the short Credential name (slug).
 *
 * @return the Credential ID.
 */
api.createCredentialId = function(name) {
  return util.format('%s%s/%s',
    config.server.baseUri,
    config['credentials-rest'].basePath,
    encodeURIComponent(name));
};
