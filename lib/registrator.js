const Etcd = require('node-etcd')
const Promise = require('bluebird')
const log = require('log-colors')
const Assert = require('assert-plus')

function Registrator (options) {
  this.client = Promise.promisifyAll(new Etcd(options))
}

Registrator.prototype.register = function ({
  name = 'NamelessService', ip = '127.0.0.1', port = 8080, router, tags = [ ], ttl = 300
} = { }) {
  const self = this

  Assert.array(tags)
  Assert.number(ttl)
  Assert.string(ip)
  Assert.string(name)
  Assert.optionalObject(router)

  const value = JSON.stringify({
    name, ip, port, router, tags
  })

  log.debug(name, 'Registered')

  return self.client.setAsync(name, value, { ttl })
}

Registrator.prototype.discover = function (name/*, tags */) {
  const self = this

  const watcher = self.client.watcher(name)
  watcher.on('change', e => log.info(`${name} changed`, e))

  return self.client.getAsync(name)
         .then(self._parseMessage)
         .error(function (err) {
            log.warn(name +  ': Service not registered. Watching for service')
            log.error(err, name)
            // Let's wait and watch for the key to show up.
            // This can happen in a complex cluster where service spin up ordering is not enforceable
            // TODO: Add timeout and recovery logic
            return self.client.watchAsync(name)
                .then(self._parseMessage)
                .then(msg => log.info(msg))
          })
}

Registrator.prototype.discoverAll = function (services) {
  const self = this

  // We were called with a single service. Client code called wrong method. Delegate call.
  if (!Array.isArray(services))
    return self.discover(services)


  // Promise.map - what does that do?
  // Promise.map will take an array (services) and a function(self.discover)
  // and call Discover several times, one time each with one value in the array.
  // Each of those calls will be in parallel and will each return a promise
  // map will keep these promises and then emit its own promise. When all of the
  // array promises resolve, map's promise will resolve
  //
  // TLDR; Array.map with promises.
  return Promise.map(services, self.discover.bind(self))
  .then(function (discoveredservices) {
     return discoveredservices.reduce(function (ctx, discoveredservice) {
       ctx[discoveredservice.name] = discoveredservice

       return ctx
     }, { })
  })
}

Registrator.prototype._parseMessage = function (message) {
  const value = message[0].node.value

  try {
    return JSON.parse(value)
  }

  catch (e) {
    return value
  }
}

module.exports = Registrator
