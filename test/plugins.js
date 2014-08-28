var chai = require('chai');
var expect = chai.expect;

//chai.use(require('chai-as-promised'));
//chai.use(require('sinon-chai'));

//var B = require('bluebird');

var plugins = require('../lib/plugins');

describe('Plugins', function () {
  function noop() {}

  afterEach(function () {
    plugins.reset();
  });

  it('is an object', function () { expect(plugins).to.be.an('object'); });

  describe('.names', function () {
    it('is empty by default', function () {
      expect(plugins.names).to.be.empty;
    });
  });

  describe('.add', function () {
    it('fails if the description has no name', function () {
      expect(plugins.add.bind(plugins)).to.throw();
      expect(plugins.add.bind(plugins, {})).to.throw();
      expect(plugins.add.bind(plugins, { process: noop })).to.throw();
    });

    it('fails if the description has no process fn', function () {
      expect(plugins.add.bind(plugins)).to.throw();
      expect(plugins.add.bind(plugins, {})).to.throw();
      expect(plugins.add.bind(plugins, { name: 'foo' })).to.throw();
    });

    it('registers the plugin with the given name', function () {
      plugins.add({ name: 'foo', process: noop });
      expect(plugins.names).to.eql(['foo']);

      plugins.add({ name: 'bar', process: noop });
      expect(plugins.names).to.include('foo', 'bar');
    });
  });
});
