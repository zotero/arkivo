var chai = require('chai');
var expect = chai.expect;

chai.use(require('chai-as-promised'));

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
});
