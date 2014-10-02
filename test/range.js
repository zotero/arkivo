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

    it('starts at 0 and has no limit', function () {
      expect(range.start).to.equal(0);
      expect(range.limit).to.be.undefined;
    });
  });

  describe('when infinite', function () {
  });

  describe('when finite', function () {
  });
});
