var chai   = require('chai');
var nock   = require('nock');
//var sinon  = require('sinon');
//var B      = require('bluebird');

var expect = chai.expect;

chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));

var plugins      = require('../../lib/plugins');
var rest         = require('../../lib/plugins/rest');

var Session      = require('../../lib/sync').Session;
var Subscription = require('../../lib/subscription');


describe('Plugin "rest"', function () {

  before(function () { plugins.add(rest); });
  after(function () { plugins.reset(); });

  it('is available', function () {
    expect(plugins.available.rest).to.be.an('object');
  });

  it('can be used', function () {
    expect(plugins.use('rest')).to.be.instanceof(plugins.Plugin);
  });

  it('is configurable', function () {
    expect(plugins.use('rest').configurable).to.be.true;
  });

  it('has a summary', function () {
    expect(plugins.use('rest')).to.have.property('summary');
  });

  it('must be configured with URLs', function () {
    var config = {};

    expect(plugins.use.bind(plugins, 'rest', config)).to.throw(Error);

    config.create = 'http://example.com/create';
    config.update = 'http://example.com/update';
    config.delete = 'foo';

    expect(plugins.use.bind(plugins, 'rest', config)).to.throw(Error);

    config.delete = 'http://example.com/delete';

    expect(plugins.use.bind(plugins, 'rest', config)).to.not.throw(Error);
  });

  describe('#process', function () {
    var HOST = 'http://example.com';
    var sync, plugin;

    beforeEach(function () {
      sync = new Session(new Subscription({
        url: '/users/42/items'
      }));

      sync.version = 11;
      sync.items.foo = {
        key: 'foo',
        data: {}
      };

      plugin = plugins.use('rest', {
        create: HOST + '/api/items',
        update: HOST + '/api/items/:key',
        delete: HOST + '/api/items/:key'
      });
    });

    it('calls create path for all created items', function () {
      nock(HOST)
        .post('/api/items', sync.items.foo)
        .reply(200);

      sync.created.push('foo');

      return expect(plugin.process(sync))
        .to.eventually.be.fulfilled;
    });

    it('calls update path for all updated items', function () {
      nock(HOST)
        .put('/api/items/foo', sync.items.foo)
        .reply(200);

      sync.updated.push('foo');

      return expect(plugin.process(sync))
        .to.eventually.be.fulfilled;
    });

    it('calls delete path for all deleted ids', function () {
      nock(HOST)
        .delete('/api/items/foo')
        .reply(201);

      sync.deleted.push('foo');

      return plugin.process(sync);
        //.to.eventually.be.fulfilled;
    });
  });
});
