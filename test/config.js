'use strict';

var expect = require('chai').expect;
var config = require('../lib/config');

describe('config', function () {

  it('has readers for each module section', function () {
    expect(config)
      .to.have.property('q')
      .and.have.property('prefix', 'q');
  });

  it('contains the configuration options', function () {
    expect(config.subscription).to.have.property('prefix', 's');
    expect(config.q).to.have.property('prefix', 'q');

    expect(config.redis).to.have.property('host', '127.0.0.1');
    expect(config.redis).to.have.property('port', 6379);
  });

  describe('#update', function () {
    it('updates existing configuration options', function () {
      var original = config.redis;

      config.update({ redis: { bar: 'baz' } });

      expect(config.redis).to.have.property('bar', 'baz');
      expect(original).to.have.property('bar', 'baz');
    });
  });
});
