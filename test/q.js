var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

//var B = require('bluebird');
var kue = require('kue');

var q = require('../lib/q');

describe('Message Queue', function () {
  beforeEach(function () {
    sinon.stub(kue, 'createQueue', function () {
      return {};
    });
  });

  afterEach(function () {
    kue.createQueue.restore();
  });

  it('is an object', function () {
    expect(q).to.be.an('object');
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
});
