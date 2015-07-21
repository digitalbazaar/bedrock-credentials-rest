/*!
 * Credentials directive.
 *
 * Copyright (c) 2014-2015 Digital Bazaar, Inc. All rights reserved.
 *
 * @author David I. Lehn
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(brAlertService, brIdentityService, brCredentialService) {
  return {
    restrict: 'E',
    scope: {
      credentialType: '@brCredentialType'
    },
    templateUrl: requirejs.toUrl(
      'bedrock-credentials-rest/components/credential/' +
      'credentials-list.html'),
    link: Link
  };

  function Link(scope) {
    var model = scope.model = {};
    model.modals = {};
    model.identity = brIdentityService.identity;
    model.state = {
      credentials: brCredentialService.state.claimed
    };
    model.credentials = brCredentialService.credentials.claimed;
    model.sorting = {
      name: '+',
      issued: '+'
    };
    model.orderBy = ['+name', '+issued'];

    model.sortClick = function(field) {
      switch(field) {
        case 'name':
          model.sorting.name = (model.sorting.name === '+') ? '-' : '+';
          model.orderBy = [
            model.sorting.name + 'name',
            model.sorting.issued + 'issued'
          ];
          break;
        case 'issued':
          model.sorting.issued = (model.sorting.issued === '+') ? '-' : '+';
          model.orderBy = [
            model.sorting.issued + 'issued',
            model.sorting.name + 'name'
          ];
          break;
      }
    };

    scope.$watch('credentialType', function(value) {
      if(angular.isUndefined(value) || value == 'claimed') {
        scope.credentialType = 'claimed';
        model.credentials = brCredentialService.credentials.claimed;
        model.state.credentials = brCredentialService.state.claimed;
      } else if(value === 'issued') {
        model.credentials = brCredentialService.credentials.issued;
        model.state.credentials = brCredentialService.state.issued;
      } else if(value === 'unclaimed') {
        model.credentials = brCredentialService.credentials.unclaimed;
        model.state.credentials = brCredentialService.state.unclaimed;
      } else {
        console.error('Unknown credential type:', value);
      }
    });

    model.confirmDeleteCredential = function(err, result) {
      if(!err && result === 'ok') {
        model.modals.credential.deleted = true;
        // wait to delete so modal can transition
        brCredentialService.collection.del(
          model.modals.credential.id, {delay: 400})
          .catch(function(err) {
            brAlertService.add('error', err, {scope: scope});
            model.modals.credential.deleted = false;
            scope.$apply();
          });
      }
    };

    brCredentialService.collections.issued.getAll();
    brCredentialService.collections.claimed.getAll();
    brCredentialService.collections.unclaimed.getAll();
  }
}

return {brCredentials: factory};

});
