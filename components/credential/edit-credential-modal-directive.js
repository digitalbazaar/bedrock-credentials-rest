/*!
 * Edit Credential Modal.
 *
 * Copyright (c) 2014-2015 Digital Bazaar, Inc. All rights reserved.
 *
 * @author David I. Lehn
 * @author Dave Longley
 */
define(['jsonld'], function(jsonld) {

'use strict';

/* @ngInject */
function factory(brAlertService, brCredentialService) {
  return {
    restrict: 'E',
    scope: {credential: '=brCredential'},
    require: '^stackable',
    templateUrl: requirejs.toUrl(
      'bedrock-credentials-rest/components/credential/' +
      'edit-credential-modal.html'),
    link: Link
  };

  function Link(scope, element, attrs, stackable) {
    var model = scope.model = {};
    model.loading = false;
    // FIXME: support more than all-or-none public access
    model.allPublic = jsonld.hasValue(scope.credential, 'sysPublic', '*');

    model.editCredential = function() {
      // build credential update
      var credential = {
        '@context': scope.credential['@context'],
        id: scope.credential.id,
        sysPublic: []
      };
      if(model.allPublic) {
        credential.sysPublic.push('*');
      }
      model.loading = true;
      brAlertService.clearFeedback();
      brCredentialService.collection.update(credential)
        .then(function(credential) {
          model.loading = false;
          stackable.close(null, credential);
        })
        .catch(function(err) {
          model.loading = false;
          brAlertService.add('error', err, {scope: scope});
          scope.$apply();
        });
    };
  }
}

return {brEditCredentialModal: factory};

});
