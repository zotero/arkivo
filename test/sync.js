//var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

//var B = require('bluebird');

var Synchronizer = require('../lib/sync');
var sync = Synchronizer.singleton;

describe('Synchronizer', function () {

  it('is a constructor', function () {
    expect(Synchronizer).to.be.an('function');
  });

  it('has a singleton instance', function () {
    expect(sync).to.be.instanceof(Synchronizer);
  });
});

