var chai   = require('chai');
var expect = chai.expect;
var sinon  = require('sinon');

chai.use(require('chai-http'));
chai.use(require('sinon-chai'));

var B = require('bluebird');

var server = require('../../lib/http').singleton;

var Subscription = require('../../lib/subscription');

describe('API', function () {
  var api, ids;

  before(function () { api = server.initialize().app; });

  beforeEach(function () {
    ids = [];

    sinon.stub(Subscription, 'ids', function () {
      return B.delay(0).return(ids);
    });

    sinon.stub(Subscription, 'load', function (id) {
      return B.delay(0).return(new Subscription({ id: id }));
    });
  });

  afterEach(function () {
    Subscription.ids.restore();
    Subscription.load.restore();
  });

  describe('GET /api/subscription', function () {
    beforeEach(function () { ids = ['foo', 'bar', 'baz']; });

    it('loads the first page of subscriptions', function (done) {
      chai.request(api)
        .get('/api/subscription')

        .res(function (res) {
          expect(res)
            .to.have.status(200)
            .and.to.be.json;

          expect(Subscription.ids)
            .to.have.been.calledWith({ start: 0, limit: 50 });

          expect(Subscription.load).to.have.been.calledThrice;

          expect(res.body).to.have.length(3);
          expect(res.body[0]).to.have.keys(['id', 'url', 'version']);

          done();
        });
    });

    it('sets the total header and next/prev links', function () {
    });
  });
});
