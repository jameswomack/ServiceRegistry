const Registry = require('..')
require('chai').should()

const util = require('util')

// Some dummy services
const ServiceA = {
		name   : 'ServiceA',
		ip     : '192.168.1.1',
		port   : '80',
    route: '/bar',
		tags   : ['Production', 'Version-1.12.2']
	}

const ServiceB = {
		name   : 'ServiceB',
		ip     : '192.168.1.2',
		port   : '81',
    route: '/foo',
		tags   : ['Development', 'Version-9.98.7']
	}


describe('Basic', function () {
	it('Register a service', function (done) {
		const registry = new Registry()

		// Register the dummy service A
		registry.Register(ServiceA.name, ServiceA.ip, ServiceA.port, ServiceA.route, ServiceA.tags)
		// Now read directly from etcd the set key
		.then(registry.client.getAsync.bind(registry.client, 'ServiceA'))
		.then(function (message) {
			const service = JSON.parse(message[0].node.value)
			service.name.should.equal(ServiceA.name)
			service.ip.should.equal(ServiceA.ip)
			service.port.should.equal(ServiceA.port)
			service.route.should.equal(ServiceA.route)
			service.tags.should.deep.equal(ServiceA.tags)
		})
		.then(done.bind(this,null))
	})

	it('Register a service and then discover it immediately after', function (done) {
		const registry = new Registry()

		// Register the dummy service B
		registry.Register(ServiceB.name, ServiceB.ip, ServiceB.port, ServiceB.route, ServiceB.tags)
		// Discover it immediately
		.then(registry.Discover.bind(registry, ServiceB.name))
		// Check that the returned service is the same
		.then(function (service) {
			service.name.should.equal(ServiceB.name)
			service.ip.should.equal(ServiceB.ip)
			service.port.should.equal(ServiceB.port)
			service.route.should.equal(ServiceB.route)
			service.tags.should.deep.equal(ServiceB.tags)
		})
		.then(done.bind(this, null))
	})

	it('Discover several services', function (done) {
		const registry = new Registry()

		// Register service A
		registry.Register(ServiceA.name, ServiceA.ip, ServiceA.port, ServiceA.route, ServiceA.tags)
		// Register service B
		.then(registry.Register.bind(registry, ServiceB.name, ServiceB.ip, ServiceB.port, ServiceB.route, ServiceB.tags))
		// Discovery both ServiceA and ServiceB
		.then(registry.DiscoverAll.bind(registry, [ServiceA.name, ServiceB.name]))
		.then(function (services) {

			console.log(util.inspect(services))
			// Service A
			services.ServiceA.name.should.equal(ServiceA.name)
			services.ServiceA.ip.should.equal(ServiceA.ip)
			services.ServiceA.port.should.equal(ServiceA.port)
			services.ServiceA.route.should.equal(ServiceA.route)
			services.ServiceA.tags.should.deep.equal(ServiceA.tags)

			// Service B
			services.ServiceB.name.should.equal(ServiceB.name)
			services.ServiceB.ip.should.equal(ServiceB.ip)
			services.ServiceB.port.should.equal(ServiceB.port)
			services.ServiceB.route.should.equal(ServiceB.route)
			services.ServiceB.tags.should.deep.equal(ServiceB.tags)
		})
		.then(done.bind(this, null))
	})
})
