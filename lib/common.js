'use strict';

var concat = Array.prototype.concat;
var slice  = Array.prototype.slice;

var zutils = require('zotero/lib/utils');

/** @module common */

// Re-use utilities from the Zotero client library
zutils.extend(exports, zutils);

exports.zip = function zip(a, b) {
  var zipped = [], i, ii;

  for (i = 0, ii = a.length; i < ii; ++i) {
    zipped.push(a[i]);
    zipped.push(b[i]);
  }

  return zipped;
};

exports.unzip = function unzip(zipped) {
  var a = [], b = [], i, ii;

  for (i = 0, ii = zipped.length; i < ii; i += 2) {
    a.push(zipped[i]);
    b.push(zipped[i + 1]);
  }

  return [a, b];
};

exports.flatten = function flatten() {
  return concat.apply([], slice.call(arguments));
};

/**
 * Returns a new pseudo-random id string.
 *
 * Based on Zotero's implementation:
 * https://github.com/zotero/zotero/blob/4.0/chrome/content/zotero/xpcom/utilities.js#L1130
 *
 * @param {Number} [N = 8] The length of the id.
 * @param {String} [alphabet] The permitted alphabet.
 *
 * @returns {String} A random string of N characters picked
 *   from the alphabet.
 */
exports.id = function id(N, alphabet) {
  var string = '';

  N = N || 8;

  alphabet = alphabet ||
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

  for (; N; --N)
    string += alphabet[Math.floor(Math.random() * alphabet.length)];

  return string;
};
