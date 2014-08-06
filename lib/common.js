'use strict';

var zutils = require('zotero/lib/utils');

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
