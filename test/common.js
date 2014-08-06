var expect = require('chai').expect;
var common = require('../lib/common');

describe('common', function () {
  it('exposes the zotero utility functions', function () {
    expect(common).to.have.property('extend');
    expect(common.extend).to.be.a('function');
  });
});
