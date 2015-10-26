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

// validation
config.validation.schema.paths.push(path.join(__dirname, '..', 'schemas'));
