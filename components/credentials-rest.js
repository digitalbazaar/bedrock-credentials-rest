/*!
 * Credential REST components module.
 *
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
define([
  'angular',
  './credential/credential'
], function(angular) {

'use strict';

var modulePath = requirejs.toUrl('bedrock-credentials-rest/components/');

var module = angular.module(
  'bedrock-credentials-rest', Array.prototype.slice.call(arguments, 1));

return module.name;

});
