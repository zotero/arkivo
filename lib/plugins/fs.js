'use strict';

// --- Dependencies ---
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
    var out  = fs.createWriteStream(path, { flags: 'w+' });

    out.on('finish', resolve);
    out.on('error', reject);

    out.end(data, 'utf-8');
  }.bind(this));
};

Store.prototype.remove = function (name) {
  name = name + '.json';

  var path = join(this.root, name);

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

  description:
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
    debug('processing subscription "%s"', sync.subscription.id);

    var store = new Store(this.options.root);

    // Ensure that the root directory exists!
    yield store.mkdir();

    debug('removing %d item(s)...', sync.deleted.length);

    yield B.map(sync.deleted, store.remove.bind(store));

    var items = sync.created.concat(sync.updated).map(function (key) {
      return sync.items[key];
    });

    debug('saving %d item(s)...', items.length);

    // Save all new and updated items..
    yield B.map(items, function (item) {
      return store.create(item.key, item);
    });

    // That's it! We can return here (or just return
    // undefined) and the Promise will be resolved.
  })
};
