'use strict';

var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

var EventEmitter = require('events').EventEmitter;
var zotero = require('../lib/zotero');

var Listener = require('../lib/listener');
var Subscription = require('../lib/subscription');

describe('Listener', function () {
  var listener, uncaught;

  beforeEach(function () {
    sinon.stub(zotero, 'stream', function () {
      var stream = new EventEmitter();

      stream.subscribe = sinon.stub().yields();

      return stream;
    });

    listener = new Listener().start();

    uncaught = sinon.spy();
    listener.on('error', uncaught);
  });

  afterEach(function () {
    zotero.stream.restore();
  });

  it('is an EventEmitter', function () {
    expect(listener).to.be.instanceof(EventEmitter);
  });

  it('opens a zotero stream', function () {
    expect(listener).to.have.property('stream');
  });

  describe('.add', function () {
    var subscriptions;

    describe('when given a single subscription', function () {
      beforeEach(function () {
        subscriptions = [
          new Subscription({ key: 'foo', url: '/bar/baz' })
        ];

        expect(listener.stream.subscribe).not.to.have.been.called;
      });

      it('sends a single message', function () {
        listener.add(subscriptions);
        expect(listener.stream.subscribe).to.have.been.called;

        var data = listener.stream.subscribe.args[0][0];

        expect(data)
          .to.be.instanceof(Array)
          .and.have.length(1);

        expect(data[0])
          .to.have.property('apiKey', subscriptions[0].key);

        expect(data[0])
          .to.have.property('topics')
          .and.to.contain(subscriptions[0].url);
      });

      it('adds the subscription to pending', function () {
        expect(listener.pending).to.be.empty;
        listener.add(subscriptions);
        expect(listener.pending).to.have.length(1);
      });

      it('resolves the promise on resolve key/topic', function () {
        process.nextTick(function () {
          listener.resolve(subscriptions[0].key, subscriptions[0].path);
          expect(listener.pending).to.be.empty;
        });

        return expect(listener.add(subscriptions))
          .eventually
          .to.be.instanceof(Array)
          .and.have.length(1);
      });

      it('rejects the promise on reject key/topic', function () {
        process.nextTick(function () {
          listener.reject(subscriptions[0].key, subscriptions[0].path);
          expect(listener.pending).to.be.empty;
        });

        return expect(listener.add(subscriptions))
          .to.eventually.be.rejected;
      });
    });

    describe('when given multiple subscriptions', function () {
      it('sends a single message', function () {
      });

      it('adds each subscription to pending individually', function () {
      });

      it('resolves once all subscriptions are confirmed', function () {
      });
    });
  });
});
