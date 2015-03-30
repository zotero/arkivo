'use strict';

var chai   = require('chai');
var expect = chai.expect;
var sinon  = require('sinon');

chai.use(require('chai-http'));
chai.use(require('sinon-chai'));

var B = require('bluebird');

var server = require('../../lib/http').instance;

//var Range        = require('../../lib/range');
var Subscription = require('../../lib/subscription');
var controller   = require('../../lib/controller').instance;

var defaults = require('../../lib/config').subscription;
var db = require('../../lib/db')(defaults.prefix);

describe('API', function () {
  var api, ids;

  before(function () {
    controller.options.listen = false;
    api = server.initialize().app;
  });

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

  after(function () {
    controller.options.listen = true;
  });

  describe('HEAD /api/subscription', function () {
    it('returns the number of subscriptions in the header', function () {
      return chai.request(api)
        .head('/api/subscription')

        .then(function (res) {
          expect(res)
            .to.have.status(200)
            .and.to.have.header('total-results', '3')
            .and.to.have.header('link')
            .and.not.to.have.header('content-type');
        });
    });

    it('sets next/prev links', function () {
      return chai.request(api)
        .head('/api/subscription?limit=2')
        .then(function (res) {
          expect(res)
            .to.have.status(200)
            .and.to.have.header('total-results', '3')
            .and.to.have.header('link');

          expect(res.headers.link)
            .to.match(/\/api\/subscription\?start=2&limit=2>; rel="next"/)
            .and.match(/\/api\/subscription\?start=1&limit=2>; rel="last"/);
        });
    });
  });

  describe('GET /api/subscription', function () {
    it('loads the first page of subscriptions', function () {
      return chai.request(api)
        .get('/api/subscription')

        .then(function (res) {
          expect(res)
            .to.have.status(200)
            .and.to.be.json;

          expect(Subscription.ids)
            .to.have.been.calledWith({ start: 0, limit: 50 });

          expect(Subscription.load).to.have.been.calledThrice;

          expect(res.body).to.have.length(ids.length);
          expect(res.body[0]).to.have.keys(['id', 'url', 'version']);
        });
    });

    it('sets the total header and next/prev links', function () {
      return chai.request(api)
        .get('/api/subscription?limit=2')
        .then(function (res) {
          expect(res)
            .to.have.status(200)
            .and.to.have.header('total-results', '3')
            .and.to.have.header('link');

          expect(res.headers.link)
            .to.match(/\/api\/subscription\?start=2&limit=2>; rel="next"/)
            .and.match(/\/api\/subscription\?start=1&limit=2>; rel="last"/);
        });
    });

    it('utilizes range params', function () {
      return chai.request(api)
        .get('/api/subscription?start=1&limit=5')
        .then(function (res) {
          expect(res)
            .to.have.status(200)
            .and.to.be.json;

          expect(Subscription.ids)
            .to.have.been.calledWith({ start: '1', limit: '5' });
        });
    });

    it('returns 400 for bad ranges', function () {
      return chai.request(api)
        .get('/api/subscription?limit=-5')
        .then(function (res) {
          expect(res)
            .to.have.status(400)
            .and.to.be.json
            .and.to.have.deep.property('body.error');
        });
    });
  });

  describe('POST /api/subscription', function () {
    beforeEach(function () {
      sinon.stub(controller, 'notify');
    });

    afterEach(function () {
      controller.notify.restore();
    });

    it('creates a new subscription from the request body', function () {
      return chai.request(api)
        .post('/api/subscription')

        .send({
          url: '/users/7/items', key: 'foo'
        })

        .then(function (res) {
          expect(res)
            .to.have.status(201)
            .and.to.be.json
            .and.to.have.header('location', '/api/subscription/id');

          expect(res.body).to.have.property('url', '/users/7/items');
          expect(res.body).to.have.property('key', 'foo');
        });
    });

    it('creates a new subscription from url params', function () {
      return chai.request(api)
        .post('/api/subscription?url=/users/8/items&key=bar')

        .send({ key: 'foo' })

        .then(function (res) {
          expect(res)
            .to.have.status(201)
            .and.to.be.json
            .and.to.have.header('location', '/api/subscription/id');

          expect(res.body).to.have.property('url', '/users/8/items');
          expect(res.body).to.have.property('key', 'foo');
        });
    });

    it('fails if there is insufficient input', function () {
      return chai.request(api)
        .post('/api/subscription?key=bar')

        .then(function (res) {
          expect(res)
            .to.have.status(400)
            .and.to.be.json;
        });
    });
  });

  describe('GET /api/subscription/:id', function () {
    describe('when the id exists', function () {
      it('returns the subscrption', function () {
        return chai.request(api)
          .get('/api/subscription/foo')

          .then(function (res) {
            expect(res)
              .to.have.status(200)
              .and.to.be.json;

            expect(res.body).to.have.property('id', 'foo');
            expect(res.body).to.have.keys(['id', 'url', 'version']);
          });
      });
    });

    describe('when the id does not exists', function () {
      it('returns a 404', function () {
        return chai.request(api)
          .get('/api/subscription/needle')
          .then(function (res) {

            expect(res)
              .to.have.status(404)
              .and.to.be.json;

            expect(res.body).to.have.property('error');
          });
      });
    });
  });

  describe('POST /api/sync', function () {

    beforeEach(function () {
      sinon.stub(controller, 'notify', function (type, data) {
        return B.fulfilled({
          id: '42', type: type, data: data
        });
      });
    });

    afterEach(function () {
      controller.notify.restore();
    });

    it('creates a new sync job for the given id', function () {
      return chai.request(api)
        .post('/api/sync')

        .send({
          id: 23, skip: true
        })

        .then(function (res) {
          expect(res)
            .to.have.status(201)
            .and.to.be.json
            .and.to.have.header('location', '/api/job/42');

          expect(res.body).to.have.deep.property('data.skip', true);
          expect(res.body).to.have.deep.property('data.id', 23);
        });
    });

    it('syncs all subscription if no id given', function () {
      return chai.request(api)
        .post('/api/sync')

        .then(function (res) {
          expect(res)
            .to.have.status(201)
            .and.to.be.json
            .and.to.have.header('location', '/api/job/42');

          expect(res.body).to.not.have.deep.property('data.skip');
          expect(res.body).to.have.deep.property('data.all', true);
        });
    });

    it('filters the POST params', function () {
      return chai.request(api)
        .post('/api/sync')

        .send({
          id: 23, foo: 'bar'
        })

        .then(function (res) {
          expect(res.body).to.not.have.deep.property('data.foo');
          expect(res.body).to.have.deep.property('data.id', 23);
        });
    });
  });

});
