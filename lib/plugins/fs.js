'use strict';

var assert = require('assert');
var fs = require('fs');
var join = require('path').join;

var debug = require('debug')('arkivo:plugins:fs');

var B  = require('bluebird');
var co = B.coroutine.bind(B);

B.promisifyAll(fs);

function Store(root) {
  assert(typeof root === 'string');
  this.root  = root;
}

Store.prototype.mkdir = function (path) {
  path = join(this.root, path || '');
  debug('mkdir %s', path);

  return fs
    .mkdirAsync(path)

    .catch(function (error) {
      if (error.cause.code === 'EEXIST')
        return true;

      throw error;
    });
};

Store.prototype.create = function (name, data) {
  return new B(function (resolve, reject) {
    data = JSON.stringify(data);
    name = name + '.json';

    var path = join(this.root, name);
    debug('saving item %s...', path);

    var out = fs.createWriteStream(name);

    out.on('finish', resolve);
    out.on('error', reject);

    out.end(data, 'utf-8');
  });
};

Store.prototype.remove = function (name) {
  name = name + '.json';

  var path = join(this.root, name);
  debug('deleting item %s...', path);

  return fs
    .unlinkAsync(path)

    .catch(function (error) {
      if (error.cause.code === 'ENOENT')
        return true;

      throw error;
    });
};


module.exports = {
  name: 'fs',

  desription:
    'Synchronizes Zotero metadata locally on '   +
    'the file system. The plugin accepts a '     +
    'single parameter to set the root directory.',

  parameters: {
    root: {
      mandatory: true,
      description: 'The root directory. This directory must exist!'
    }
  },

  // In this example the plugin uses Bluebird.couroutine
  // which returns a Promise, therefore, we do not need
  // to use the `done` callback at all.
  process: co(function* (sync) {
    var store = new Store(this.options.root);

    // Ensure that the root directory exists!
    yield store.mkdir();

    // Remove all deleted items..
    yield B
      .all(sync.deleted, store.remove.bind(store));

    // Save all new and updated items..
    yield B
      .map(sync.created.concat(sync.updated), lookup)
      .all(store.create.bind(store));

    function lookup(id) { return sync.items[id]; }

    // That's it! We can return here (or just return
    // undefined) and the Promise will be resolved.
  })
};
