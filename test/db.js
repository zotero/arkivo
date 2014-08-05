/*globals
  describe: true it: true after: true before: true
  beforeEach: true afterEach: true */

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var redis = require('redis');

chai.use(require('sinon-chai'));

var db = require('../lib/db');

describe('db', function () {
  function noop() {}

  before(function () {
    sinon.stub(redis, 'createClient', function () {
      var proxy = { sadd: noop, del: noop };

      sinon.stub(proxy, 'sadd');
      sinon.stub(proxy, 'del');

      return proxy;
    });
  });

  after(function () {
    redis.createClient.restore();
  });

  it('is a function', function () {
    expect(db).to.be.a('function');
  });

  describe('constructor', function () {

    it('creates a redis proxy using the passed-in name', function () {
      expect(db('ns').name).to.equal('ns');
    });

    it('calls redis.createClient with default options', function () {
      redis.createClient.reset();
      expect(redis.createClient).to.not.have.been.called;

      db('foo');

      expect(redis.createClient).to.have.been.called;
    });
  });

  describe('proxy +1 methods', function () {
    var database;

    beforeEach(function () { database = db('ns'); });

    it('namespace the first argument', function () {
      database.sadd('foo');
      expect(database.client.sadd).to.have.been.calledWith('ns:foo');
    });

    it('fail if less than one argument is given', function () {
      expect(function () { database.sadd(); }).to.throw(Error);
    });

    it('pass on the remaining arguments as is', function () {
      database.sadd('foo', 'bar', 'baz');
      expect(database.client.sadd).to.have.been.calledWith('ns:foo', 'bar', 'baz');
    });

    it('does not mess with the callback', function () {
      database.sadd('foo', noop);
      expect(database.client.sadd).to.have.been.calledWith('ns:foo', noop);
    });
  });

  describe('proxy -1 methods', function () {
    var database;

    beforeEach(function () { database = db('ns'); });

    it('namespace the first argument', function () {
      database.del('foo');
      expect(database.client.del).to.have.been.calledWith('ns:foo');
    });

    it('do not fail if less than one argument is given', function () {
      expect(function () { database.del(); }).to.not.throw(Error);
    });

    it('namespace all arguments', function () {
      database.del('foo', 'bar', 'baz');
      expect(database.client.del).to.have.been.calledWith('ns:foo', 'ns:bar', 'ns:baz');
    });

    it('does not mess with the callback', function () {
      database.del('foo', noop);
      expect(database.client.del).to.have.been.calledWith('ns:foo', noop);
    });
  });
});
