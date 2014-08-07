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
      return { on: sinon.spy(), saddAsync: sinon.spy(), delAsync: sinon.spy() };
    });
  });

  after(function () {
    redis.createClient.restore();
  });

  it('is a function', function () {
    expect(db).to.be.a('function');
  });

  describe('constructor', function () {

    it('returns a new Database Proxy', function () {
      var database = db('foo');

      expect(database).to.be.instanceof(db.Database);
      expect(database).to.be.instanceof(db.Proxy);
    });

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
      expect(database.client.saddAsync).to.have.been.calledWith('ns:foo');
    });

    it('fail if less than one argument is given', function () {
      expect(function () { database.sadd(); }).to.throw(Error);
    });

    it('pass on the remaining arguments as is', function () {
      database.sadd('foo', 'bar', 'baz');
      expect(database.client.saddAsync)
        .to.have.been.calledWith('ns:foo', 'bar', 'baz');
    });

    it('does not mess with the callback', function () {
      database.sadd('foo', noop);
      expect(database.client.saddAsync).to.have.been.calledWith('ns:foo', noop);
    });
  });

  describe('proxy -1 methods', function () {
    var database;

    beforeEach(function () { database = db('ns'); });

    it('namespace the first argument', function () {
      database.del('foo');
      expect(database.client.delAsync).to.have.been.calledWith('ns:foo');
    });

    it('do not fail if less than one argument is given', function () {
      expect(function () { database.del(); }).to.not.throw(Error);
    });

    it('namespace all arguments', function () {
      database.del('foo', 'bar', 'baz');

      expect(database.client.delAsync)
        .to.have.been.calledWith('ns:foo', 'ns:bar', 'ns:baz');
    });

    it('does not mess with the callback', function () {
      database.del('foo', noop);
      expect(database.client.delAsync).to.have.been.calledWith('ns:foo', noop);
    });
  });

  describe('.transaction', function () {
    var database;

    beforeEach(function () {
      database = db('ns');

      database.client.multi = sinon.spy(function () {
        return {
          execAsync: sinon.spy(function () { return 'exec'; }),
          saddAsync: sinon.spy(function () { return this; })
        };
      });
    });

    it('returns a new transaction', function () {
      expect(database.transaction()).to.be.instanceof(db.Transaction);
    });

    it('calls MULTI on the redis client', function () {
      expect(database.client.multi).to.not.have.been.called;
      database.transaction();
      expect(database.client.multi).to.have.been.called;
    });

    describe('proxy +1 methods', function () {
      var transaction;

      beforeEach(function () { transaction = database.transaction(); });

      it('are forwarded to the multi object', function () {
        expect(transaction.multi.saddAsync).to.not.have.been.called;
        transaction.sadd('foo');
        expect(transaction.multi.saddAsync).to.have.been.called;
      });

      it('namespace the first argument', function () {
        transaction.sadd('foo', 'bar');

        expect(transaction.multi.saddAsync)
          .to.have.been.calledWith('ns:foo', 'bar');
      });

      it('can be chained if target returns itself', function () {
        expect(transaction.sadd('foo')).to.be.equal(transaction);

        transaction.sadd('bar').sadd('baz');

        expect(transaction.multi.saddAsync).to.have.been.calledThrice;

        expect(transaction.multi.saddAsync).to.have.been.calledWith('ns:foo');
        expect(transaction.multi.saddAsync).to.have.been.calledWith('ns:bar');
        expect(transaction.multi.saddAsync).to.have.been.calledWith('ns:baz');
      });
    });

    describe('.commit', function () {
      it('calls EXEC on the multi object', function () {
        var transaction = database.transaction();

        expect(
          transaction.sadd('foo').sadd('bar').commit()
        ).to.eql('exec');

        expect(transaction.multi.saddAsync).to.have.been.calledTwice;

        expect(transaction.multi.saddAsync).to.have.been.calledWith('ns:foo');
        expect(transaction.multi.saddAsync).to.have.been.calledWith('ns:bar');

        expect(transaction.multi.execAsync).to.have.been.calledOnce;
      });
    });
  });

});
