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
    ids = ['foo', 'bar', 'baz'];

    sinon.stub(Subscription, 'ids', function () {
      return B.delay(0).return(ids);
    });

    sinon.stub(Subscription, 'load', function (id) {
      if (ids.indexOf(id) >= 0)
        return B.delay(0).return(new Subscription({ id: id }));

      return B.delay(0).throw(new Subscription.NotFoundError('not found'));
    });
  });

  afterEach(function () {
    Subscription.ids.restore();
    Subscription.load.restore();
  });

  describe('GET /api/subscription', function () {
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

          expect(res.body).to.have.length(ids.length);
          expect(res.body[0]).to.have.keys(['id', 'url', 'version']);

          done();
        });
    });

    it('sets the total header and next/prev links', function () {
    });
  });

  describe('GET /api/subscription/:id', function () {

    describe('when the id exists', function () {
      it('returns the subscrption', function (done) {
        chai.request(api)
          .get('/api/subscription/foo')

          .res(function (res) {
            expect(res)
              .to.have.status(200)
              .and.to.be.json;

            expect(res.body).to.have.property('id', 'foo');
            expect(res.body).to.have.keys(['id', 'url', 'version']);

            done();
          });
      });
    });

    describe('when the id does not exists', function () {
      it('returns a 404', function (done) {
        chai.request(api)
          .get('/api/subscription/needle')
          .res(function (res) {

            expect(res)
              .to.have.status(404)
              .and.to.be.json;

            expect(res.body).to.have.property('error');

            done();
          });
      });
    });

  });
});
