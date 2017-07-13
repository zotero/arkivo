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

      stream.subscribe = sinon.stub();
      stream.unsubscribe = sinon.stub();

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

  describe('.remove', function () {
    beforeEach(function () {
      listener.subscriptions.push({
        id: 'id1', key: 'key1', topic: '/users/42'
      });

      listener.subscriptions.push({
        id: 'id2', topic: '/users/42'
      });

      listener.subscriptions.push({
        id: 'id3', topic: '/users/42'
      });
    });

    it('removes the subscription by id', function () {
      expect(listener.subscriptions).to.have.length(3);

      listener.remove('id1');
      expect(listener.subscriptions).to.have.length(2);
      expect(listener.stream.unsubscribe).to.have.been.called;
      expect(listener.stream.unsubscribe.args[0][0])
            .to.have.property('apiKey', 'key1');

      listener.stream.unsubscribe.reset();

      listener.remove('id2');
      expect(listener.subscriptions).to.have.length(1);
      expect(listener.stream.unsubscribe).not.to.have.been.called;

      listener.remove('id3');
      expect(listener.subscriptions).to.have.length(0);
      expect(listener.stream.unsubscribe).to.have.been.called;
    });

  });

  describe('.add', function () {
    var subscriptions;

    describe('when given a single subscription', function () {
      beforeEach(function () {
        subscriptions = [
          new Subscription({ key: 'foo', url: '/users/42/baz' })
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
          .and.to.contain(subscriptions[0].topic);
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
