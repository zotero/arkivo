/*globals
  describe: true it: true after: true before: true
  beforeEach: true afterEach: true */ 

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var redis = require('redis');

chai.use(require('sinon-chai'));

var Database = require('../lib/db');

describe('Database', function () {

  before(function () {
    sinon.stub(redis, 'createClient', function () {
      var proxy = { sadd: function () {} };

      sinon.stub(proxy, 'sadd');

      return proxy;
    });
  });

  after(function () {
    redis.createClient.restore();
  });

  it('is a function constructor', function () {
    expect(Database).to.be.a('function');
  });

  describe('constructor', function () {

    it('creates a redis proxy using the passed-in name', function () {
      expect((new Database('ns')).name).to.equal('ns');
    });

    it('calls redis.createClient with default options', function () {
      redis.createClient.reset();
      expect(redis.createClient).to.not.have.been.called;

      new Database('foo');

      expect(redis.createClient).to.have.been.called;
    });
  });

  describe('proxy -1- methods', function () {
    var db;

    beforeEach(function () { db = new Database('ns'); });

    it('namespace the first argument', function () {
      db.sadd('foo');
      expect(db.client.sadd).to.have.been.calledWith('ns:foo');
    });

    it('fail if less than one argument is given', function () {
      expect(function () { db.sadd(); }).to.throw(Error);
    });

    it('pass on the remaining arguments as is', function () {
      db.sadd('foo', 'bar', 'baz');
      expect(db.client.sadd).to.have.been.calledWith('ns:foo', 'bar', 'baz');
    });
  });
});
