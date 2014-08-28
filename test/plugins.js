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

  describe('Plugin', function () {
    var plugin;

    describe('#configure', function () {

      describe('when the plugin has no parameters', function () {
        beforeEach(function () {
          plugin = plugins
            .add({ name: 'noop', process: noop })
            .use('noop');
        });

        it('does not do anything', function () {
          plugin.configure({ foo: 'bar' });
          expect(plugin).to.not.have.property('options');
        });
      });

      describe('when the plugin has parameters', function () {
        beforeEach(function () {
          plugin = plugins
            .add({
              name: 'noop',
              process: noop,
              parameters: {
                foo: { mandatory: true },
                bar: { default: 'baz' },
                numeric: { validate: /^\d+$/ }
              }
            })
            .use('noop');
        });

        it('sets the parameters to the passed-in values', function () {
          plugin.configure({ foo: 'bar', bar: 'foo', numeric: '42' });

          expect(plugin.options).to.have.property('foo', 'bar');
          expect(plugin.options).to.have.property('bar', 'foo');
        });

        it('sets the parameters to their default values', function () {
          plugin.configure({ foo: 'bar' });
          expect(plugin.options).to.have.property('bar', 'baz');
        });

        it('fails if a mandatory parameter has no value', function () {
          expect(function () {
            plugin.configure({ bar: 'baz' });
          }).to.throw();
        });

        it('fails if passed invalid parameter values', function () {
          expect(function () {
            plugin.configure({ foo: 'bar', numeric: 'forty-two' });
          }).to.throw();
        });
      });
    });
  });
});
