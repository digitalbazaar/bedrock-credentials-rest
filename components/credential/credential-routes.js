/*!
 * Credential Routes.
 *
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
define([], function() {

return [{
  path: '/credentials',
  options: {
    title: 'Credentials',
    templateUrl: requirejs.toUrl(
      'bedrock-credentials-rest/components/credential/' +
      'credentials.html')
  }
}];

});
