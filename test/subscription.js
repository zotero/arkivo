var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

var B = require('bluebird');
var Subscription = require('../lib/subscription');

describe('Subscription', function () {
  it('is a constructor function', function () {
    expect(Subscription).to.be.a('function');
  });

  it('has keys', function () {
    expect(Subscription).to.have.property('keys');
  });

  describe('constructor', function () {
    it('returns an empty subscription by default', function () {
      expect(new Subscription()).to.exist;
    });

    it('accepts an object or an array', function () {
      expect(new Subscription(['x'])).to.have.property('id', 'x');
      expect(new Subscription({ id: 'y' })).to.have.property('id', 'y');
    });
  });

  describe('#version', function () {
    it('is zero by default', function () {
      expect((new Subscription()).version).to.equal(0);
    });

    it('is stored as an integer', function () {
      var s = new Subscription();

      s.version = 3;
      expect(s.version).to.equal(3);

      s.version = '42';
      expect(s.version).to.equal(42);

      s.version = 'foo';
      expect(s.version).to.equal(0);
    });
  });

  describe('#url', function () {
    var s;

    beforeEach(function () { s = new Subscription(); });

    it('is an empty string by default', function () {
      expect(s.url).to.equal('');
    });

    it('is composed of pathname and params', function () {
      expect(s.pathname).to.be.null;
      expect(s.params).to.be.empty;

      s.pathname = 'foo';
      expect(s.url).to.equal('foo');

      s.params.bar = 'baz';
      expect(s.url).to.equal('foo?bar=baz');
    });

    it('sets pathname and params automatically', function () {
      s.url = 'foo/bar?baz=true';

      expect(s.pathname).to.equal('foo/bar');
      expect(s.params).to.have.property('baz', 'true');

      s = new Subscription({ url: 'tra/la/la?debug=false' });

      expect(s.pathname).to.equal('tra/la/la');
      expect(s.params).to.have.property('debug', 'false');
    });
  });

  describe('.load', function () {
    afterEach(function () {
      Subscription.db.hgetall.restore();
    });

    describe('for existing subscriptions', function () {
      beforeEach(function () {
        sinon.stub(Subscription.db, 'hgetall', function () {
          return B.fulfilled({ id: 'foo', bar: 'baz' });
        });
      });

      it('returns a promise for the subscription', function () {
        return expect(Subscription.load('foo'))
          .to.be.instanceOf(B)
          .and.eventually.be.fulfilled
          .and.instanceOf(Subscription)
          .and.have.property('bar', 'baz');
      });
    });

    describe('for non-existing subscriptions', function () {
      beforeEach(function () {
        sinon.stub(Subscription.db, 'hgetall', function () {
          return B.fulfilled({});
        });
      });

      it('fails if the subscription does not exist', function () {
        return expect(Subscription.load('foo'))
          .to.eventually.be.rejectedWith(/not found/i);
      });
    });
  });

  describe('#values', function () {
    it('returns the values for each key', function () {
      var s = new Subscription();

      expect(s.values).to.have.length(Subscription.keys.length);

      s[Subscription.keys[0]] = 'foo';
      expect(s.values[0]).to.eql('foo');
    });
  });

  describe('#serialize', function () {
    it('returns a zipped array of all keys and values', function () {
      var s = (new Subscription()).serialize();

      expect(s).to.be.an.instanceof(Array);
      expect(s).to.have.length(Subscription.keys.length * 2);

      expect(s[0]).to.equal(Subscription.keys[0]);
      expect(s[1]).to.equal(s[Subscription.keys[0]]);
    });
  });

  describe('#save', function () {
    var t;

    function chainspy() {
      return sinon.spy(function () { return this; });
    }

    beforeEach(function () {
      t = {
        sadd: chainspy(),
        hmset: chainspy(),
        commit: B.fulfilled.bind(B)
      };

      sinon.stub(Subscription.db, 'transaction', function () {
        return t;
      });

      sinon.stub(Subscription, 'exists', function () {
        return B.fulfilled(false);
      });
    });

    afterEach(function () {
      Subscription.db.transaction.restore();
      Subscription.exists.restore();
    });

    it('returns a promise for the saved subscription', function () {
      var s = new Subscription({ url: 'foo' });

      return expect(s.save())
        .to.eventually.be.fulfilled
        .and.equal(s)
        .and.have.property('url', 'foo');
    });

    it('saves all keys', function () {
      var s = new Subscription();

      s.pathname = 'foo';
      s.params.bar = 'baz';
      s.key = '42';

      return s.save()
        .then(function () {
          expect(t.hmset).to.have.been.calledOnce;

          var call = t.hmset.getCall(0);

          expect(call.args).to.have.length(2);
          expect(call.args[1]).to.have.length(Subscription.keys.length * 2);
          expect(call.args[0]).to.equal(call.args[1][1]);
          expect(call.args[1].slice(2, 8)).to.eql([
            'url', 'foo?bar=baz', 'key', '42', 'version', 0
          ]);
        });
    });

    describe('for new subscriptions', function () {
      it('generates a new id', function () {
        var s = new Subscription({});

        return expect(s.save())
          .to.eventually.be.fulfilled
          .and.equal(s)
          .and.have.property('id').and.have.length(10);
      });
    });

    describe('for existing subscriptions', function () {
      it('does not alter the id', function () {
        return expect((new Subscription({ id: 'foo' })).save())
          .to.eventually.be.fulfilled
          .and.have.property('id', 'foo');
      });
    });
  });

  describe('#identify', function () {
    var COLLISIONS = 2;

    beforeEach(function () {
      var called = 0;

      sinon.stub(Subscription.db, 'sismember', function () {
        return B.fulfilled().then(function () {
          return (called++ < COLLISIONS);
        });
      });
    });

    afterEach(function () {
      Subscription.db.sismember.restore();
    });

    it('returns a promise for the subscription with an id', function () {
      var s = new Subscription();

      expect(s).to.not.have.property('id');
      return expect(s.identify()).eventually.to.equal(s)
        .and.to.have.property('id').and.to.have.length(10);
    });

    it('sets a unique id', function () {
      return (new Subscription()).identify().then(function () {
        expect(Subscription.db.sismember.callCount).to.equal(COLLISIONS + 1);
      });
    });

    it('does not change anything if subscription already has id', function () {
      var s = new Subscription({ id: 'foo' });

      return expect(s.identify()).eventually.to.equal(s)
        .and.to.have.property('id', 'foo');
    });
  });

  describe('.all', function () {
    beforeEach(function () {
      sinon.stub(Subscription.db, 'smembers', function () {
        return B.fulfilled(['foo', 'bar', 'baz']);
      });

      sinon.stub(Subscription, 'load', function () {
        return B.fulfilled(new Subscription());
      });
    });

    afterEach(function () {
      Subscription.db.smembers.restore();
      Subscription.load.restore();
    });

    it('loads all subscriptions', function () {
      return Subscription.all().then(function (s) {
        expect(s).to.have.length(3);
        expect(s[0]).to.be.instanceof(Subscription);
        expect(Subscription.load).to.have.been.calledTrice;

        expect(Subscription.load).to.have.been.calledWith('foo');
        expect(Subscription.load).to.have.been.calledWith('bar');
        expect(Subscription.load).to.have.been.calledWith('baz');
      });
    });
  });
});
