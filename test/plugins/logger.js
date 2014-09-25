var chai   = require('chai');
var sinon  = require('sinon');
var expect = chai.expect;

chai.use(require('sinon-chai'));

//chai.use(require('chai-as-promised'));

//var B = require('bluebird');

var plugins = require('../../lib/plugins');
var logger  = require('../../lib/plugins/logger');

var Synchronization = require('../../lib/sync').Synchronization;
var Subscription    = require('../../lib/subscription');

describe('Plugin "logger"', function () {

  before(function () { plugins.add(logger); });
  after(function ()  { plugins.reset(); });

  it('is available', function () {
    expect(plugins.available.logger).to.be.an('object');
  });

  it('can be used', function () {
    expect(plugins.use('logger')).to.be.instanceof(plugins.Plugin);
  });

  describe('#process', function () {
    var sync;

    beforeEach(function () {
      sync = new Synchronization(new Subscription({
        url: '/users/42/items'
      }));

      sinon.stub(console, 'log');
    });

    afterEach(function () { console.log.restore(); });

    it('prints not modified sync data to console.log by default',
      function (done) {
        expect(console.log).to.not.have.been.called;

        expect(sync.modified).to.be.false;

        plugins.use('logger').process(sync, function () {
          expect(console.log).to.have.been.called;
          done();
        });
      });

    it('prints modified sync data to console.log by default', function (done) {
      expect(console.log).to.not.have.been.called;

      sync.version = 7;
      sync.updated.push('foo');
      sync.items.foo = { data: {} };

      expect(sync.modified).to.be.true;

      plugins.use('logger').process(sync, function () {
        expect(console.log).to.have.been.called;
        done();
      });
    });
  });
});

