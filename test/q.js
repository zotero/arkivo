var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

//var B = require('bluebird');
var kue = require('kue');

var MessageQueue = require('../lib/q');
var q = MessageQueue.instance;

describe('Q', function () {
  beforeEach(function () {
    sinon.stub(kue, 'createQueue', function () {
      return {
        shutdown: sinon.stub().yields(),
        on: sinon.stub()
      };
    });
  });

  afterEach(function () {
    kue.createQueue.restore();
  });

  it('is a MessageQueue', function () {
    expect(q).to.be.instanceof(MessageQueue);
  });

  describe('.jobs', function () {
    it('is an object', function () {
      expect(q.jobs).to.be.an('object');
    });
  });

  describe('.app', function () {
    it('is an object', function () {
      expect(q.app).to.be.a('function');
    });
  });

  describe('.shutdown', function () {
    it('calls q.jobs.shutdown', function () {
      expect(q.jobs.shutdown).to.not.have.been.called;

      return q.shutdown()
        .then(function () {
          expect(q.jobs.shutdown).to.have.been.called;
        });
    });
  });
});
