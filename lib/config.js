const Etcd = require('node-etcd')
const Promise = require('bluebird')
const log = require('log-colors')

const util = require('util')

function Config (options) {
    this.Initialize(options)
}

Config.prototype.Initialize = function (options) {
    this.client = Promise.promisifyAll(new Etcd(options))
}

Config.prototype.Register = function (name, ip, port, route, tags, ttl) {
    const self = this

    // We want the tags to be always an array object (even if single valued or null)
    // TODO: Make this neater - maybe underscore has something for this?
    // null         => []
    // 'tag'        => ['tag']
    // ['tag1',...] => ['tag1',...]
    tags = tags
            ? Array.isArray(tags)
                ? [].concat(tags)
                : [tags]
            : []

    let value = {
                    name    : name    || 'NamelessService',
                    ip      : ip      || '127.0.0.1',
                    port    : port    || '8080',
                    route   : route   || '/' + name,
                    tags    : tags
                }

    value = JSON.stringify(value)

    const opts = {}

    if (ttl)
        opts.ttl = ttl

    return self.client.setAsync(name, value, opts)
}

Config.prototype.Discover = function (name/*, tags */) {
    const self = this

    return self.client.getAsync(name)
           .then(self._parseMessage)
           .error(function (err) {
                log.warn(name +  ': Service not registered. Watching for service')
                log.error(err)
                // Let's wait and watch for the key to show up.
                // This can happen in a complex cluster where service spin up ordering is not enforceable
                // TODO: Add timeout and recovery logic
                return self.client.watchAsync(name)
                    .then(self._parseMessage)
            })
}

Config.prototype.DiscoverAll = function (services) {
    const self = this

    // We were called with a single service. Client code called wrong method. Delegate call.
    if (!Array.isArray(services))
        return self.Discover(services)


    // Promise.map - what does that do?
    // Promise.map will take an array (services) and a function(self.Discover)
    // and call Discover several times, one time each with one value in the array.
    // Each of those calls will be in parallel and will each return a promise
    // map will keep these promises and then emit its own promise. When all of the
    // array promises resolve, map's promise will resolve
    //
    // TLDR; Array.map with promises.
    return Promise.map(services, self.Discover.bind(self))
    .then(function (discoveredservices) {
       return discoveredservices.reduce(function (ctx, discoveredservice) {
         ctx[discoveredservice.name] = discoveredservice

         return ctx
       }, { })
    })
}

Config.prototype._parseMessage = function (message) {
    log.info(util.inspect(message))
    const value = message[0].node.value

    try {
        return JSON.parse(value)
    }

 catch (e) {
        return value
    }
}

module.exports = Config
