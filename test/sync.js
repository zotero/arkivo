//var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

//var B = require('bluebird');

var Synchronizer = require('../lib/sync');
var Synchronization = Synchronizer.Synchronization;

var sync = Synchronizer.singleton;

describe('Synchronizer', function () {
  it('is a constructor', function () {
    expect(Synchronizer).to.be.an('function');
  });

  it('has a singleton instance', function () {
    expect(sync).to.be.instanceof(Synchronizer);
  });
});

describe('Synchronization', function () {
  it('is a constructor', function () {
    expect(Synchronization).to.be.an('function');
  });

  describe('#diff', function () {
    var s;

    beforeEach(function () {
      s = new Synchronization();
    });

    it('detects created items', function () {
      s.diff({ a: 1, b: 2, c: 4 }, { a: 1, b: 2 });
      expect(s.created).to.eql(['c']);
    });

    it('detects updated items', function () {
      s.diff({ a: 1, b: 3, c: 4 }, { a: 1, b: 2 });
      expect(s.updated).to.eql(['b']);
    });

    it('detects deleted items', function () {
      s.diff({ a: 1, c: 4 }, { a: 1, b: 2 });
      expect(s.deleted).to.eql(['b']);
    });

    it('returns empty CRUD lists when items stay the same', function () {
      s.diff({ a: 1, b: 2 }, { a: 1, b: 2 });

      expect(s.created).to.empty;
      expect(s.updated).to.empty;
      expect(s.deleted).to.empty;
    });

  });
});
