[![Build Status](https://travis-ci.org/SidBala/ServiceRegistry.svg)](https://travis-ci.org/SidBala/ServiceRegistry)

# ServiceRegistry
A library to manage service registry and discover over etcd.

You will need a connection to etcd. If you're registering services, you will additionally need the public ip of your host.

In the common use case where your service is a docker container on top of CoreOS/Fleet, you will need to connect to the etcd endpoint at 172.17.42.1. You will determine your own ip/port by passing them as parameters in your fleet service definition.

## Connect to etcd
```js
const Registry = require('etcd-service-registry')

const registry = new Registry()
const registry = new Registry('127.0.0.1', '4001')
```

## Register a service

```js
registry.Register('MyServiceName',      // Name that will be used by your clients
                  '10.244.1.105',       // IP that the service is bound to
                  '8080',               // Port that the service is bound to
                  ['Testing', 'V1.1'])  // Some metadata tags
.then(...)
```

## Discover a service

A call to Discover will not fulfill until the required service has been registered into etcd.

```js
registry.Discover('MyServiceName')
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
registry.DiscoverAll(['ServiceA', 'ServiceB'])
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
node example/proxy-server/
```

Accessing a proxy endpoint
```
curl localhost:5000/foo/snore/lax
```
