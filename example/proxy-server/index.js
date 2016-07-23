const Assert = require('assert-plus')
const HTTPProxy = require('http-proxy')
const Restify = require('restify')
const Registry = require('../../')

const proxy = HTTPProxy.createProxyServer()

const serviceConfigs = [{
  name   : 'ServiceSansRouter',
  ip     : '127.0.0.1',
  port   : 1337,
  tags   : ['Production', 'Version-1.12.2']
}, {
  name   : 'ServiceWithRouter',
  ip     : '127.0.0.1',
  port   : 1338,
  router : {
    '/foo' : [{
      method : 'GET',
      path   : '/snore/lax'
    }, {
      method : 'PUT',
      path   : '/poke/:mon'
    }]
  },
  tags   : ['Development', 'Version-9.98.7']
}]

const registry = new Registry(/* argv.ei, argv.ep */)

serviceConfigs.forEach(serviceConfig => {
  registry.Register(serviceConfig)

  const server = Restify.createServer()

  server.on('error', console.error.bind(console))
  server.on('uncaughtException', console.error.bind(console))

  if (serviceConfig.router)
    Object.keys(serviceConfig.router).forEach(pathPrefix => {
      serviceConfig.router[pathPrefix].forEach(routeConfig => {
        Assert.string(routeConfig.method)
        Assert.string(routeConfig.path)
        server[routeConfig.method.toLowerCase()](routeConfig.path, function (req, res, next) {
          res.send({
            routeConfig,
            params : req.params
          })
          next()
        })
      })
    })
  else
    server.use(function (req, res, next) {
      res.send({
        params : req.params
      })
      next()
    })

  server.listen(serviceConfig.port, function () {
    console.info(`Listening on ${serviceConfig.port}`)
  })
})

const server = Restify.createServer()
server.on('error', console.error.bind(console))
server.on('uncaughtException', console.error.bind(console))
server.use(Restify.acceptParser(server.acceptable))
server.use(Restify.bodyParser())
server.use(Restify.gzipResponse())
server.pre(Restify.pre.sanitizePath())
server.use(Restify.fullResponse())
server.use(Restify.throttle({
  burst : 100,
  rate  : 50,
  ip    : true
}))
server.use(Restify.requestExpiry({ header: 'x-request-expiry-time' }))

server.listen(5000, function () {
  console.info('Listening on 5000')
})

registry.Discover('ServiceWithRouter')
  .then(function (service) {
    if (service.router)
      Object.keys(service.router).forEach(pathPrefix => {
        service.router[pathPrefix].forEach(routeConfig => {
          Assert.string(routeConfig.method)
          Assert.string(routeConfig.path)
          server[routeConfig.method.toLowerCase()](`${pathPrefix}${routeConfig.path}`, function (req, res) {
            const target = `http://${service.ip}:${service.port}${routeConfig.path}`
            console.info(req, pathPrefix, routeConfig, service, target)
            proxy.web(req, res, {
              target     : target,
              ignorePath : true
            })
          })
        })
      })
    else
      server.use(function (req, res, next) {
        res.send({
          params : req.params
        })
        next()
      })
  })
