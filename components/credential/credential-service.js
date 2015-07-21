/*!
 * Credential Service.
 *
 * Copyright (c) 2014-2015 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(
  $rootScope, brIdentityService, brRefreshService, brResourceService, config) {
  var service = {};
  // storage for different collections
  service.collections = {};

  // FIXME: public access allowed so may not have an identity to use
  // FIXME: if collection tries to use url, should login and set this

  // generic collection of credentials
  service.collection = new brResourceService.Collection({
    url: '/credentials'
  });

  // credentials claimed by current identity
  service.collections.claimed = new brResourceService.Collection({
    url:
      '/credentials?filter=claimed&recipient=' +
      encodeURIComponent(brIdentityService.identity.id)
  });

  // credentials issued by current identity
  service.collections.issued = new brResourceService.Collection({
    url:
      '/credentials?issuer=' +
      encodeURIComponent(brIdentityService.identity.id)
  });

  // unclaimed credentials where current identity is the recipient
  service.collections.unclaimed = new brResourceService.Collection({
    url:
      '/credentials?filter=unclaimed&recipient=' +
      encodeURIComponent(brIdentityService.identity.id)
  });

  service.credentials = {
    issued: service.collections.issued.storage,
    claimed: service.collections.claimed.storage,
    unclaimed: service.collections.unclaimed.storage
  };
  service.state = {
    issued: service.collections.issued.state,
    claimed: service.collections.claimed.state,
    unclaimed: service.collections.unclaimed.state
  };

  // register for system-wide refreshes
  brRefreshService.register(service.collections.issued);
  brRefreshService.register(service.collections.claimed);
  brRefreshService.register(service.collections.unclaimed);

  // expose service to scope
  $rootScope.app.services.credential = service;

  return service;
}

return {brCredentialService: factory};

});
