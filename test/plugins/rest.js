var chai   = require('chai');
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

  describe('#process', function () {
    var sync;

    beforeEach(function () {
      sync = new Session(new Subscription({
        url: '/users/42/items'
      }));
    });

    afterEach(function () {});

  });
});
