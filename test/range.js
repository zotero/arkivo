'use strict';

var chai = require('chai');
var expect = chai.expect;

var Range = require('../lib/range');

describe('Range', function () {
  var range;

  beforeEach(function () { range = new Range(); });

  it('is a function', function () {
    expect(Range).to.be.a('function');
  });

  describe('.parse', function () {
    it('returns a new range by default', function () {
      expect(Range.parse()).to.be.instanceof(Range);
    });

    it('returns ranges untouched', function () {
      expect(Range.parse(range)).to.equal(range);
    });

    it('creates a new range from options', function () {
      expect(Range.parse({ start: 42 }).start).to.eql(42);
    });

    it('validates new ranges', function () {
      expect(Range.parse.bind(Range, { start: 42, total: 40 }))
        .to.throw(RangeError);

      expect(Range.parse.bind(Range, { limit: '-5' }))
        .to.throw(RangeError);
    });
  });

  describe('by default', function () {
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

    it('has no next and previous', function () {
      expect(range.next()).to.be.null;
      expect(range.prev()).to.be.null;
    });

    it('is the first and last', function () {
      expect(range.first()).to.equal(range);
      expect(range.last()).to.equal(range);
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
      expect(range.prev().bounds).to.eql([0, 2]);
      expect(range.prev().prev()).to.be.null;

      expect(range.next().prev().bounds).to.eql([1, 3]);
      expect(range.next().next().bounds).to.eql([7, 9]);

      expect(range.first().bounds).to.eql([0, 2]);

      expect(range.last().bounds).to.eql([-3, -1]);
      expect(range.last().prev().bounds).to.eql([-6, -4]);
      expect(range.last().prev().next().bounds).to.eql([-3, -1]);
    });
  });

  describe('when finite', function () {
    it('works with positive start/limit input', function () {
      range = new Range(1, 3, 9);

      expect(range.valid).to.be.true;

      expect(range.start).to.eql(1);
      expect(range.limit).to.eql(3);
      expect(range.total).to.eql(9);

      expect(range.bounds).to.eql([1, 3]);

      expect(range.finite).to.be.true;
      expect(range.open).to.be.false;
      expect(range.done).to.be.false;

      expect(range.next().bounds).to.eql([4, 6]);
      expect(range.prev().bounds).to.eql([0, 2]);
      expect(range.prev().prev()).to.be.null;

      expect(range.next().prev().bounds).to.eql([1, 3]);

      expect(range.next().next().bounds).to.eql([7, 8]);
      expect(range.next().next().next()).to.be.null;

      expect(range.first().bounds).to.eql([0, 2]);

      expect(range.last().bounds).to.eql([6, 8]);
      expect(range.last().done).to.be.true;

      range = new Range([1, 3, 8]);

      expect(range.valid).to.be.true;

      expect(range.next().next().bounds).to.eql([7, 7]);
      expect(range.last().bounds).to.eql([5, 7]);
    });
  });
});
