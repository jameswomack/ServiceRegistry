#!/usr/bin/env node

const argv = require('optimist')
    .usage('Sidekick.js'.green.bold.underline + ': ' + 'Register' + ' and ' + 'monitor' + ' a service on etcd via CLI. ')
    .demand('n')
    .alias('n', 'name')
    .describe('n', 'Name of the service you wish to register')
    .demand('i')
    .alias('i', 'ip')
    .describe('i', 'Publicly accesible ip of your service')
    .demand('p')
    .alias('p', 'port')
    .describe('p', 'Port of your service')
    .demand('r')
    .alias('r', 'route')
    .describe('r', 'Route your service will be exposed via')
    .alias('e', 'expiry')
    .describe('e', 'Expiry interval for registration on etcd')
    .default('e', 15)
    .alias('t', 'poll')
    .describe('t', 'Polling interval for health check')
    .default('t', 5)
    .alias('ei', 'etcdip')
    .describe('ei', 'Etcd service ip')
    .default('ei', 'localhost')
    .alias('ep', 'etcdport')
    .describe('ep', 'Etcd service port')
    .default('ep', 4001)
    .argv

const Registry = require('etcd-service-registry')
const log = require('winston')
log.remove(log.transports.Console)
log.add(log.transports.Console, {timestamp: true,colorize: true})

const registry = new Registry(argv.ei, argv.ep)

console.log('Sidekick Summary'.green.underline)
console.log('Service Name     : ' + argv.n.blue)
console.log('Service Endpoint : ' + argv.i.blue + ' : '+ argv.p.toString().blue)
console.log('Health Check     : ' + 'TCP poll'.blue + ' every ' + argv.t.toString().blue + ' second(s)' )
console.log('Expiry interval  : ' + argv.e.toString().blue + ' second(s)')
console.log('Logs'.green.underline)

const net = require('net')

let retries = 0
const maxRetries = 3

function healthCheckLoop () {
    const client = new net.Socket()

    client.setTimeout(argv.t * 1000)

    client.on('timeout', onHealthFail.bind(this,'Timeout'))
    client.on('error', onHealthFail)

    // Attempt connection here
    // This will succeed if the TCP socket is bound on the target ip:port
    client.connect({port: argv.port, host: argv.i, route: argv.route}, onHealthPass)

    // If the health check fails, we log it and attempt retry maxRetries times
    function onHealthFail (reason) {
        client.destroy()

        // If reason is an error object instead of a string, extract the message
        reason = reason.message || reason

        log.warn('Health:'+ ' FAIL'.red + ' Reason: ' + reason.red +  ' Attempt: ' + (retries + 1).toString() + ' of ' + maxRetries.toString())

        retries = retries+1

        if (retries < maxRetries)
            if (reason === 'Timeout')
                setImmediate(healthCheckLoop)
            else
                setTimeout(healthCheckLoop, argv.t * 1000)
    }

    // If the service is good, we write to etcd with the TTL expiry set
    function onHealthPass () {
        log.info('Health:' + ' PASS'.green)
        retries = 0
        client.destroy()
        registry.Register(argv.name, argv.ip, argv.port, argv.route, null, argv.e)
        .then(setTimeout.bind(this,healthCheckLoop, argv.t * 1000))
        .error(function (err) {
            log.error('Could not register service into etcd: ' + err)
        })
    }
};

healthCheckLoop()
