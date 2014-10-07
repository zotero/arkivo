var chai   = require('chai');
var expect = chai.expect;
var sinon  = require('sinon');

chai.use(require('chai-http'));
chai.use(require('sinon-chai'));

var B = require('bluebird');

var server = require('../../lib/http').singleton;

//var Range        = require('../../lib/range');
var Subscription = require('../../lib/subscription');

var defaults = require('../../lib/defaults');
var db = require('../../lib/db')(defaults.subscription.prefix);

describe('API', function () {
  var api, ids;

  before(function () { api = server.initialize().app; });

  beforeEach(function () {
    ids = ['foo', 'bar', 'baz'];

    sinon.stub(db, 'zcard', function () {
      return B.fulfilled(ids.length);
    });

    sinon.stub(db, 'zrange', function () {
      return B.fulfilled(ids);
    });

    sinon.spy(Subscription, 'ids');

    sinon.stub(Subscription, 'load', function (id) {
      if (ids.indexOf(id) >= 0)
        return B.fulfilled(new Subscription({ id: id }));

      return B.rejected(new Subscription.NotFoundError('not found'));
    });

    sinon.stub(Subscription.prototype, 'save', function () {
      var self = this;

      if (!this.url)
        return B.rejected(new Subscription.ValidationError('no url'));

      self.id = 'id';
      return B.fulfilled(self);
    });
  });

  afterEach(function () {
    db.zrange.restore();
    db.zcard.restore();

    Subscription.ids.restore();
    Subscription.load.restore();
    Subscription.prototype.save.restore();
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

    it('utilizes range params', function (done) {
      chai.request(api)
        .get('/api/subscription?start=1&limit=5')
        .res(function (res) {
          expect(res)
            .to.have.status(200)
            .and.to.be.json;

          expect(Subscription.ids)
            .to.have.been.calledWith({ start: '1', limit: '5' });

          done();
        });
    });

    it('returns 400 for bad ranges', function (done) {
      chai.request(api)
        .get('/api/subscription?limit=-5')
        .res(function (res) {
          expect(res)
            .to.have.status(400)
            .and.to.be.json
            .and.to.have.deep.property('body.error');

          done();
        });
    });
  });

  describe('POST /api/subscription', function () {
    it('creates a new subscription from the request body', function (done) {
      chai.request(api)
        .post('/api/subscription')

        .req(function (req) {
          req.send({ url: '/users/7/items', key: 'foo' });
        })

        .res(function (res) {
          expect(res)
            .to.have.status(201)
            .and.to.be.json
            .and.to.have.header('location', '/api/subscription/id');

          expect(res.body).to.have.property('url', '/users/7/items');
          expect(res.body).to.have.property('key', 'foo');

          done();
        });
    });

    it('creates a new subscription from url params', function (done) {
      chai.request(api)
        .post('/api/subscription?url=/users/8/items&key=bar')

        .req(function (req) {
          req.send({ key: 'foo' });
        })

        .res(function (res) {
          expect(res)
            .to.have.status(201)
            .and.to.be.json
            .and.to.have.header('location', '/api/subscription/id');

          expect(res.body).to.have.property('url', '/users/8/items');
          expect(res.body).to.have.property('key', 'foo');

          done();
        });
    });

    it('fails if there is insufficient input', function (done) {
      chai.request(api)
        .post('/api/subscription?key=bar')

        .res(function (res) {
          expect(res)
            .to.have.status(400)
            .and.to.be.json;

          done();
        });
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
