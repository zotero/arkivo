'use strict';

var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

var B = require('bluebird');

var Controller = require('../lib/controller');
var controller = Controller.instance;

var Subscription = require('../lib/subscription');

describe('Controller', function () {
  it('is a Controller', function () {
    expect(controller).to.be.instanceof(Controller);
  });

  describe('subscriptions', function () {
    beforeEach(function () {
      sinon.stub(Subscription.prototype, 'save', function () {
        return B.fulfilled(this);
      });

      sinon.stub(Subscription.prototype, 'destroy', function () {
        return B.fulfilled(this);
      });

      sinon.stub(Subscription, 'load', function (id) {
        return B.fulfilled(new Subscription({ id: id }));
      });

      sinon.stub(controller, 'notify');

      controller.options.listen = false;
    });

    afterEach(function () {
      controller.notify.restore();
      Subscription.prototype.save.restore();
      Subscription.prototype.destroy.restore();
      Subscription.load.restore();
    });

    describe('#subscribe', function () {
      it('saves a subscription', function () {
        expect(Subscription.prototype.save).to.not.have.been.called;

        return controller.subscribe({ url: 'bar' })
          .then(function () {
            expect(Subscription.prototype.save).to.have.been.called;
          });
      });

      it('notifies sync on success', function () {
        expect(controller.notify).to.not.have.been.called;

        return controller.subscribe({ url: 'bar' })
          .then(function () {
            expect(controller.notify).to.have.been.called;
          });
      });

      it('eventually returns a new subscription', function () {
        return expect(controller.subscribe({ url: 'bar' }))
          .to.eventually.be.instanceof(Subscription)
          .and.to.have.property('url', 'bar');
      });
    });

    describe('#unsubscribe', function () {

      it('loads the subscription', function () {
        expect(Subscription.load).to.not.have.been.called;

        return controller.unsubscribe({ id: 'baz' })
          .then(function () {
            expect(Subscription.load).to.have.been.calledWith('baz');
          });
      });

      it('eventually returns the destroyed subscription', function () {
        return expect(controller.unsubscribe({ id: 'bar' }))
          .to.eventually.be.instanceof(Subscription)
          .and.to.have.property('id', 'bar');
      });
    });
  });

});
