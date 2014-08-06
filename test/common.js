var expect = require('chai').expect;
var common = require('../lib/common');

describe('common', function () {
  it('exposes the zotero utility functions', function () {
    expect(common).to.have.property('extend');
    expect(common.extend).to.be.a('function');
  });

  describe('.zip', function () {
    it('combines two arrays', function () {
      expect(common.zip(['a', 'b'], [0, 1])).to.eql(['a', 0, 'b', 1]);

      expect(common.zip([], [1, 2])).to.eql([]);

      expect(common.zip(['a', 'b'], []))
        .to.eql(['a', undefined, 'b', undefined]);

      expect(common.zip(['a', 'b'], [1, 2, 3])).to.eql(['a', 1, 'b', 2]);
    });
  });

  describe('.unzip', function () {
    it('splits one array into two', function () {
      expect(common.unzip(['a', 1, 'b', 2])).to.eql([['a', 'b'], [1, 2]]);

      expect(common.unzip([])).to.eql([[], []]);

      expect(common.unzip([])).to.not.equal([[], []]);

      expect(common.unzip(['a'])).to.eql([['a'], [undefined]]);
    });
  });

  describe('.flatten', function () {
    it('returns the arguments to an array', function () {
      expect(common.flatten()).to.eql([]);
      expect(common.flatten([])).to.eql([]);

      expect(common.flatten(0)).to.eql([0]);
      expect(common.flatten([0])).to.eql([0]);

      expect(common.flatten(0, 1)).to.eql([0, 1]);
      expect(common.flatten([0, 1])).to.eql([0, 1]);

      expect(common.flatten([0, 1], 2)).to.eql([0, 1, 2]);
      expect(common.flatten(0, [1])).to.eql([0, 1]);
    });
  });
});
