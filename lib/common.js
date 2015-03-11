'use strict';

var assert = require('assert');
var crypto = require('crypto');

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
 * Plucks the values of the passed-in properties from an object.
 *
 * @method pluck
 * @static
 *
 * @param {Object} obj
 * @param {String|Array<String>} keys* The keys to pluck.
 *
 * @return {Array} The values of the given `keys`.
 */
exports.pluck = function pluck(obj) {
  var i, ii, result = [],
    keys = concat.apply([], slice.call(arguments, 1));

  for (i = 0, ii = keys.length; i < ii; ++i)
    result.push(obj[keys[i]]);

  return result;
};

/*eslint-disable max-len */

/**
 *eslint max-len: 0
 * Returns a new pseudo-random id string.
 *
 * Based on Zotero's implementation:
 * https://github.com/zotero/zotero/blob/4.0/chrome/content/zotero/xpcom/utilities.js#L1130
 *
 * @method id
 * @static
 *
 * @param {Number} [N = 16] The length of the id.
 * @param {String} [alphabet] The permitted alphabet.
 *
 * @returns {String} A random string of N characters picked
 *   from the alphabet.
 */
exports.id = function id(N, alphabet) {
  var string = '';

  N = N || 10;
  alphabet = alphabet || '0123456789abcdefghijklmnopqrstuvwxyz';

  for (; N; --N)
    string += alphabet[Math.floor(Math.random() * alphabet.length)];

  return string;
};

/*eslint-enable max-len */

exports.each = function each(list, iterator) {
  return list.forEach(iterator);
};

exports.capitalize = function capitalize(string) {
  assert(typeof string === 'string');

  if (string.length > 1)
    return string[0].toUpperCase() + string.slice(1);

  return string;
};

exports.md5 = function (data, enc) {
  return crypto
    .createHash('md5')
    .update(data, enc || 'binary')
    .digest('hex');
};

exports.base64 = function (data) {
  if (!(data instanceof Buffer))
    data = new Buffer(data);

  return data.toString('base64');
};
