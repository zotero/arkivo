'use strict';

var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

var EventEmitter = require('events').EventEmitter;
var zotero = require('../lib/zotero');

var Listener = require('../lib/listener');

describe('Listener', function () {
  var listener;

  beforeEach(function () {
    sinon.stub(zotero, 'stream', function () {
      var stream = new EventEmitter();
      return stream;
    });

    listener = new Listener();
  });

  afterEach(function () {
    zotero.stream.restore();
  });

  it('is an EventEmitter', function () {
    expect(listener).to.be.instanceof(EventEmitter);
  });

  it('opens a zotero stream', function () {
    expect(listener).to.have.property('stream');
  });
});
