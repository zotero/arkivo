var chai = require('chai');
var expect = chai.expect;

//chai.use(require('chai-as-promised'));
//chai.use(require('sinon-chai'));

//var B = require('bluebird');

var plugins = require('../../lib/plugins');
var logger = require('../../lib/plugins/logger');

describe('Plugin "logger"', function () {

  before(function () { plugins.add(logger); });
  after(function ()  { plugins.reset(); });

  it('is available', function () {
    expect(plugins.available.logger).to.be.an('object');
  });
});

