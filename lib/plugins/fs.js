'use strict';

// --- Dependencies ---
var assert = require('assert');
var fs = require('fs-extra');
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
    .mkdirpAsync(path)
    .return(path)

    .catch(function (error) {
      if (error.cause.code === 'EEXIST')
        return path;

      throw error;
    });
};

Store.prototype.save = function (item) {
  return this
    .mkdir(item.data.parentItem || item.key)

    .then(function (path) {
        return [join(path, item.key + '.json'), JSON.stringify(item), 'utf-8'];
    })

    .spread(fs.writeFileAsync.bind(fs));
};

Store.prototype.remove = function (key) {
  return fs
    .unlinkAsync(join(this.root, key, key + '.json'))

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
      description: 'The storage root directory.'
    }
  },

  // In this example the plugin uses Bluebird.couroutine
  // which returns a Promise, therefore, we do not need
  // to use the `done` callback at all.
  process: co(function* (sync) {
    debug('processing subscription "%s"', sync.id);

    var store = new Store(this.options.root);

    // Ensure that the root directory exists!
    yield store.mkdir();

    debug('removing %d item(s)...', sync.deleted.length);

    yield B.map(sync.deleted, store.remove.bind(store));

    var items = sync.created
      .concat(sync.updated)
      .map(function (key) { return sync.items[key]; });

    debug('saving %d item(s)...', items.length);

    // Save all new and updated items..
    yield B.map(items, function (item) {
      if (item.data.itemType === 'attachment')
        download(item);

      return store.save(item);
    });

    // That's it! We can return here (or just return
    // undefined) and the Promise will be resolved.
  })
};

function download(item, sync) {
  item.attachment = sync.get(join('items', item.key, 'file', 'view'));
}
