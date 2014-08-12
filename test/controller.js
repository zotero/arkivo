//var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

//var B = require('bluebird');
var controller = require('../lib/controller');

describe('Controller', function () {
  it('is an object', function () { expect(controller).to.be.an('object'); });
});
