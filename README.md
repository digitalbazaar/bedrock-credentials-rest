# bedrock-credentials-rest

![build status](http://ci.digitalbazaar.com/buildStatus/icon?job=bedrock-credetials-rest)

A [bedrock][] module that implements a RESTful API for credential storage.

The main endpoint uses query paramters for filtering. The endpoint may access
both local and externally created credentials depending on the type of system.
While local credentials may use a simple resource path such as
`/credentials/1234` this can become confusing when accessing a credential with
a full URL id. The ID would have to be a URL encoded path parameter. The
alternate approach user here is to use the `id` query parameter when referring
to a credential by ID.

## Requirements

- npm v3+

## Quick Examples

```
npm install bedrock-credentials-rest
```

Configurable credentials endpoint (defaults to `/credentials`):
```js
var config = require('bedrock').config;
config['credentials-rest'].basePath = '/credentials';
```

Get one credential:
```
GET /credentials?id=<ID>

{
  <credential data>
}
```

Get all credentials with optional filters:
```
GET /credentials?<params>

[
  {
    <credential data>
  }, ...
]
```

Available filters:

* recipient=ID: Filter by credential recipient.
* issuer=ID: Filter by credential issuer.
* filter=<claimed|unclaimed>: Filter by state.

General paramters:

* format=FORMAT: Force particular output format.

[bedrock]: https://github.com/digitalbazaar/bedrock
