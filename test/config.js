'use strict';

var expect = require('chai').expect;
var config = require('../lib/config');

describe('config', function () {

  it('has readers for each module section', function () {
    expect(config.proxy).to.have.property('q').and.have.property('prefix', 'q');

    expect(config.subscription).to.equal(config.options.subscription);
    expect(config.sync).to.equal(config.options.sync);
    expect(config.redis).to.equal(config.options.redis);
  });

  it('contains the configuration options', function () {
    expect(config.subscription).to.have.property('prefix', 's');
    expect(config.q).to.have.property('prefix', 'q');

    expect(config.redis).to.have.property('host', '127.0.0.1');
    expect(config.redis).to.have.property('port', 6379);
  });

  describe('#update', function () {

    it('updates existing configuration options', function () {
      var original = config.options.redis;

      config.update({ redis: { bar: 'baz' } });

      expect(config.redis).to.have.property('bar', 'baz');
      expect(original).to.have.property('bar', 'baz');
    });

    it('does not add new module sections', function () {
      config.update({ foo: { bar: 'baz' } });
      expect(config.options).to.not.have.property('foo');
    });
  });
});
