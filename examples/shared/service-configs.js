module.exports = [{
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
