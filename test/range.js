var chai = require('chai');
var expect = chai.expect;

var Range = require('../lib/range');

describe('Range', function () {
  var range;

  it('is a function', function () {
    expect(Range).to.be.a('function');
  });

  describe('by default', function () {
    beforeEach(function () { range = new Range(); });

    it('is infinite', function () {
      expect(range.finite).to.be.false;
    });

    it('is valid', function () {
      expect(range.valid).to.be.true;
    });

    it('is done', function () {
      expect(range.done).to.be.true;
    });

    it('is open', function () {
      expect(range.open).to.be.true;
    });

    it('starts at 0 and has no limit', function () {
      expect(range.start).to.equal(0);
      expect(range.limit).to.be.undefined;

      expect(range.query).to.have.keys(['start']);
    });
  });

  describe('when infinite', function () {
    it('works with positive start/limit input', function () {
      range = new Range(1, 3);

      expect(range.start).to.eql(1);
      expect(range.limit).to.eql(3);

      expect(range.bounds).to.eql([1, 3]);

      expect(range.total).to.be.undefined;
      expect(range.finite).to.be.false;
      expect(range.open).to.be.false;
      expect(range.done).to.be.false;

      expect(range.next().bounds).to.eql([4, 6]);

      range.total = 9;
      expect(range.next().next().bounds).to.eql([7, 8]);
      //expect(range.last().bounds).to.eql([7, 8]);
      expect(range.next().next().next()).to.be.null;

      range.total = 8;
      //expect(range.last().bounds).to.eql([7, 7]);
      //expect(range.prev().bounds).to.eql([0, 2]);
    });
  });

  describe('when finite', function () {
  });
});
