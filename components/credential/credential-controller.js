/*!
 * Credential Controller.
 *
 * Copyright (c) 2014-2015 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
define(['jsonld'], function(jsonld) {

'use strict';

/* @ngInject */
function factory(
  $scope, brAlertService, brRefreshService, brCredentialService) {
  var self = this;
  self.state = brCredentialService.state;
  self.modals = {};

  self.credential = null;
  self.allPublic = false;
  self.loading = true;

  $scope.$watch(function() { return self.credential; }, function(credential) {
    if(!credential) {
      return;
    }
    self.allPublic = jsonld.hasValue(self.credential, 'sysPublic', '*');
    if(self.credential.sysDisplayContext) {
      jsonld.promises.compact(
        self.credential, self.credential.sysDisplayContext)
        .then(function(compacted) {
          self.compacted = compacted;
        })
        .catch(function(err) {
          brAlertService.add('error', err, {scope: $scope});
        })
        .then(function() {
          $scope.$apply();
        });
    }
  });

  self.confirmDeleteCredential = function(err, result) {
    if(!err && result === 'ok') {
      self.credential.deleted = true;
      // wait to delete so modal can transition
      brCredentialService.collection.del(self.credential.id, {delay: 400})
        .catch(function(err) {
          brAlertService.add('error', err, {scope: $scope});
          self.credential.deleted = false;
          $scope.$apply();
        });
    }
  };

  brRefreshService.register($scope, function(force) {
    // delay to show loading screen to avoid quick flashes
    var opts = {
      force: !!force,
      delay: 250,
      resourceParams: ['id']
    };
    self.loading = true;
    brAlertService.clear();
    brCredentialService.collection.getCurrent(opts)
      .then(function(credential) {
        self.loading = false;
        self.credential = credential;
        $scope.$apply();
      })
      .catch(function(err) {
        brAlertService.add('error', err, {scope: $scope});
        self.loading = false;
        $scope.$apply();
      });
  })();
}

return {brCredentialController: factory};

});
