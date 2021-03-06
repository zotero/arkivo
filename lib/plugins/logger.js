'use strict';

// Plugins are defined by adding a Plugin description
// to the `plugins` object. A minimal description must
// contain at least a `name` property and a `process`
// function. The name is used to select and look-up the
// plugin; the process function performs the actual
// plugin functionality. When called, it will be passed
// a synchronization object containing all the relevant
// data (updated or deleted items, etc.).
module.exports = {

  name: 'logger',

  description:
    'Logs the synchronization data to the console. ' +
    'This plugin accepts a single parameter that '   +
    'configures which console method to use (log, '  +
    'info, warn, or error).',

  parameters: {
    method: {
      default: 'log',
      description:
        'The console method to use (log, info, warn, or error)',
      validate: /^log|info|warn|error$/
    }
  },

  process: function logger(sync, done) {

    // Access parameter values through `this.options`;
    // this object contains the values set by the current
    // subscription's configuration.

    // Here, we use `this.options.method` to determine
    // which console method to use for printing.
    var print =
      console[this.options.method].bind(console); // eslint-disable-line no-console

    // Access the current subscription through the
    // synchronization object.
    print(
      '\n\nSynchronization Results\n'                                  +
      '============================================================\n' +
      'URL: %s\n'                                                      +
      'Last Version: %d\n'                                             +
      '------------------------------------------------------------',

      sync.subscription.url, sync.subscription.version
    );

    // When there is no sync data available this means
    // that there have been no updates since the last
    // time this subscription was synchronized.
    if (!sync.modified) {
      print('New Version: Not Modified');

    } else {

      print('New Version: %d', sync.version);

      header('Created');
      sync.created.forEach(details);

      header('Updated');
      sync.updated.forEach(details);

      header('Deleted');
      sync.deleted.forEach(details);
    }

    print(
      '============================================================\n'
    );

    // In this example the plugin does not use promises,
    // so it needs to call `done` when it has finished
    // processing the synchronization data.
    done();

    // When using callbacks, the return value of the
    // plugin's process method is irrelevant. You do
    // not even need to return anything at all.

    // A helper method to print out item details.
    function details(key) {
      var item = sync.items[key];

      if (!item) return print(key);
      print('%s: %j', key, item.data);
    }

    // A helper method to print headlines
    function header(title) {
      print(
        '\n\n%s\n' +
        '------------------------------------------------------------',
        title
      );
    }
  }
};
