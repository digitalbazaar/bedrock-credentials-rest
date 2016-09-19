/*
 * Copyright (c) 2016 Digital Bazaar, Inc. All rights reserved.
 */

var config = require('bedrock').config;
var path = require('path');

config.mocha.tests.push(path.join(__dirname, 'mocha'));

// MongoDB
config.mongodb.name = 'bedrock_credentials_rest_test';
config.mongodb.host = 'localhost';
config.mongodb.port = 27017;
config.mongodb.local.collection = 'bedrock_credentials_rest_test';
config.mongodb.username = 'bedrock';
config.mongodb.password = 'password';
config.mongodb.adminPrompt = true;
config.mongodb.dropCollections.onInit = true;
config.mongodb.dropCollections.collections = [];

var permissions = config.permission.permissions;

config.permission.roles['credential.admin'] = {
  id: 'credential.admin',
  label: 'Credential Administrator',
  comment: 'Role for credential administrators.',
  sysPermission: [
    permissions.CREDENTIAL_ADMIN.id,
    permissions.CREDENTIAL_ACCESS.id,
    permissions.CREDENTIAL_INSERT.id,
    permissions.CREDENTIAL_REMOVE.id
  ]
};

config.permission.roles['credential.user'] = {
  id: 'credential.user',
  label: 'Credential User',
  comment: 'Role for credential users.',
  sysPermission: [
    permissions.CREDENTIAL_ACCESS.id,
    permissions.CREDENTIAL_INSERT.id,
    permissions.CREDENTIAL_REMOVE.id
  ]
};
