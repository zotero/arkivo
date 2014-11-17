var chai   = require('chai');
//var sinon  = require('sinon');
//var B      = require('bluebird');

var expect = chai.expect;

chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));

var plugins      = require('../../lib/plugins');
var restful      = require('../../lib/plugins/restful');

var Session      = require('../../lib/sync').Session;
var Subscription = require('../../lib/subscription');


describe('Plugin "restful"', function () {

  before(function () { plugins.add(restful); });
  after(function () { plugins.reset(); });

  it('is available', function () {
    expect(plugins.available.restful).to.be.an('object');
  });

  it('can be used', function () {
    expect(plugins.use('restful')).to.be.instanceof(plugins.Plugin);
  });

  it('is configurable', function () {
    expect(plugins.use('restful').configurable).to.be.true;
  });

  it('has a summary', function () {
    expect(plugins.use('restful')).to.have.property('summary');
  });

  describe('#process', function () {
    var sync;

    beforeEach(function () {
      sync = new Session(new Subscription({
        url: '/users/42/items'
      }));
    });

    afterEach(function () { console.log.restore(); });

  });
});
