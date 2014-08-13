//var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

//var B = require('bluebird');

var q = require('../lib/q');

describe('Message queue', function () {
  it('is an object', function () {
    expect(q).to.be.an('object');
  });

  describe('.jobs', function () {
    it('is an object', function () {
      expect(q.jobs).to.be.an('object');
    });
  });
});
