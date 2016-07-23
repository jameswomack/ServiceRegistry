const Registry = require('..')
require('chai').should()

// Some dummy services
const ServiceSansRouter = {
		name   : 'ServiceSansRouter',
		ip     : '192.168.1.1',
		port   : '80',
		tags   : ['Production', 'Version-1.12.2']
	}

const ServiceWithRouter = {
		name     : 'ServiceWithRouter',
		ip       : '192.168.1.2',
		port     : '81',
    router : {
      '/foo' : [{
        method : 'GET',
        path   : '/snore/lax'
      }, {
        method : 'PUT',
        path   : '/poke/:mon'
      }]
    },
		tags     : ['Development', 'Version-9.98.7']
	}


describe('Basic', function () {
	it('Register a service', function (done) {
		const registry = new Registry()

		// Register the dummy service A
		registry.register(ServiceSansRouter)
		// Now read directly from etcd the set key
		.then(() => registry.client.getAsync('ServiceSansRouter'))
		.then(function (message) {
			const service = JSON.parse(message[0].node.value)
			service.name.should.equal(ServiceSansRouter.name)
			service.ip.should.equal(ServiceSansRouter.ip)
			service.port.should.equal(ServiceSansRouter.port)
			service.tags.should.deep.equal(ServiceSansRouter.tags)
		})
		.then(() => done(null))
	})

	it('Register a service and then discover it immediately after', function (done) {
		const registry = new Registry()

		// Register the dummy service B
		registry.register(ServiceWithRouter)
		// Discover it immediately
		.then(registry.discover.bind(registry, ServiceWithRouter.name))
		// Check that the returned service is the same
		.then(function (service) {
			service.name.should.equal(ServiceWithRouter.name)
			service.ip.should.equal(ServiceWithRouter.ip)
			service.port.should.equal(ServiceWithRouter.port)
			service.router.should.deep.equal(ServiceWithRouter.router)
			service.tags.should.deep.equal(ServiceWithRouter.tags)
		})
    .then(() => done(null))
	})

	it('Discover several services', function (done) {
		const registry = new Registry()

		// Register service A
		registry.register(ServiceSansRouter)
		// Register service B
		.then(() => registry.register(ServiceWithRouter))
		// Discovery both ServiceSansRouter and ServiceWithRouter
		.then(() => registry.discoverAll([ServiceSansRouter.name, ServiceWithRouter.name]))
		.then(function (services) {

			console.dir(services, { colors : true, hidden : true, depth : Infinity })
			// Service A
			services.ServiceSansRouter.name.should.equal(ServiceSansRouter.name)
			services.ServiceSansRouter.ip.should.equal(ServiceSansRouter.ip)
			services.ServiceSansRouter.port.should.equal(ServiceSansRouter.port)
			services.ServiceSansRouter.tags.should.deep.equal(ServiceSansRouter.tags)

			// Service B
			services.ServiceWithRouter.name.should.equal(ServiceWithRouter.name)
			services.ServiceWithRouter.ip.should.equal(ServiceWithRouter.ip)
			services.ServiceWithRouter.port.should.equal(ServiceWithRouter.port)
			services.ServiceWithRouter.router.should.deep.equal(ServiceWithRouter.router)
			services.ServiceWithRouter.tags.should.deep.equal(ServiceWithRouter.tags)
		})
		.then(() => done(null))
	})
})
