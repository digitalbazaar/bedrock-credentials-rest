/*!
 * Credentials module.
 *
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
define([
  'angular',
  './credential-controller',
  './credential-service',
  './credentials-list-directive',
  './edit-credential-modal-directive',
  './export-credential-modal-directive',
  './credential-routes'
], function(
  angular,
  credentialController,
  credentialService,
  credentialsListDirective,
  editCredentialModalDirective,
  exportCredentialModalDirective,
  routes
) {

'use strict';

var module = angular.module('bedrock-credentials-rest.credential', []);

// TODO: need widgets for:
// viewing claimed credentials
// managing ACL for pre-authorized access to credentials
// screen with pluggable credential displayer? would be nice to
//   make it replaceable so a better displayer can be used
// viewing notifications of unclaimed credentials or done as part of another
// module?

module.controller(credentialController);
module.service(credentialService);
module.directive(credentialsListDirective);
module.directive(editCredentialModalDirective);
module.directive(exportCredentialModalDirective);

/* @ngInject */
module.config(function($routeProvider) {
  angular.forEach(routes, function(route) {
    $routeProvider.when(route.path, route.options);
  });
});

return module.name;

});
