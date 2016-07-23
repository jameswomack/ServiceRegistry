[![Build Status](https://travis-ci.org/jameswomack/registrator.svg)](https://travis-ci.org/jameswomack/registrator)

# Registrator
A library to manage service registry and discover over etcd.

You will need a connection to etcd (`brew install etcd && etcd`).

This module was designed to allow an edge server or middle later to provide a unified façade to other HTTP services.

## Connect to etcd
```js
const Registry = require('registrator')

const registry = new Registry()
const registry = new Registry('127.0.0.1', '4001')
```

## Register a service

```js
registry.register('MyServiceName',      // Name that will be used by your clients
                  '10.244.1.105',       // IP that the service is bound to
                  '8080',               // Port that the service is bound to
                  ['Testing', 'V1.1'])  // Some metadata tags
.then(...)
```

## Discover a service

A call to Discover will not fulfill until the required service has been registered into etcd.

```js
registry.discover('MyServiceName')
.then(function(service) {
        console.log(util.inspect(service))
      })
.then(...)

// {
//    name: 'MyServiceName',
//    ip: '10.244.1.105',
//    port: '8080',
//    routes: { '/foo': [{ ... }] },
//    tags: ['Testing', 'V1.1']
// }
```

## Discover several services at once

A call to DiscoverAll will not fulfill until **all** the services specified have been registered into etcd.

```js
registry.discoverAll(['ServiceA', 'ServiceB'])
.then(function(services) {
        console.log(util.inspect(services));
      })
.then(...);

// { 
//     ServiceA:
//     { 
//        name: 'ServiceA',
//        ip: '192.168.1.1',
//        port: '80',
//        tags: [ 'Production', 'Version-1.12.3' ]
//     },
//     ServiceB:
//     {
//        name: 'ServiceB',
//        ip: '192.168.1.2',
//        port: '81',
//        routes: { '/foo' : [{ ... }] },
//        tags: [ 'Production', 'Version-1.12.4' ]
//     }
// }
```

# Example

Running the example
```
node examples/proxy-server-restify/
```

Accessing a proxy endpoint
```
curl localhost:5000/foo/snore/lax
```
