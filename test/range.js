var chai = require('chai');
var expect = chai.expect;

var Range = require('../lib/range');

describe('Range', function () {
  var range;

  it('is a function', function () {
    expect(Range).to.be.a('function');
  });

  it('by default', function () {
    beforeEach(function () { range = new Range(); });

    it('is infinite', function () {
      expect(range.finite).to.be.false;
    });

    it('is valid', function () {
      expect(range.valid).to.be.true;
    });

    it('starts at 0 and has no limit', function () {
      expect(range.start).to.equal(0);
      expect(range.limit).to.be.undefined;

      expect(range.params).to.have.keys(['start']);
    });
  });

  describe('when infinite', function () {
    it('works with to/from input', function () {
      range = new Range(1, 3);

      expect(range.array).to.eql([1, 3]);
      expect(range.start).to.eql(1);

      expect(range.limit).to.eql(2);
    });
  });

  describe('when finite', function () {
  });
});
