#!/usr/bin/env node

require('gnode');

var B       = require('bluebird');
var program = require('commander');
var user    = require('co-prompt');

var Subscription = require('../lib/subscription');


function shutdown() {
  Subscription.db.reset();
  process.stdin.destroy();
}

program
  .version(require('../package.json').version)
  .option('-k, --keys', 'show Zotero API keys in output');

program
  .command('list')
  .description('List all subscriptions')

  .action(function list() {

    var print = program.keys ?
      function (s) { console.log('  %s %s %s', s.id, s.url, s.key); } :
      function (s) { console.log('  %s %s', s.id, s.url); };

    Subscription
      .all()

      .then(function (subscriptions) {
        console.log('%d subscription(s) found.', subscriptions.length);
        subscriptions.forEach(print);

        return subscriptions;
      })

      .catch(function (error) {
        console.log('Failed to list subscriptions: %s', error.message);
        console.error(error.stack);
      })

      .finally(shutdown);
  });


program
  .command('show <subscriptions>')
  .description('Print details of given subscription(s)')

  .action(function show(ids) {

    function pad(string, padding, max) {
      while (string.length < max)
        string = padding + string;

      return string;
    }

    function print(name, value) {
      console.log('%s: %s', pad(name, ' ', 18), value);
    }

    B.map(ids.split(','), function (id) {
      return Subscription.load(id);
    })

      .each(function (s, idx) {
        if (idx) console.log('');

        print('Subscription', s.id);
        print('Zotero URL', s.url);

        if (program.keys)
          print('API key', s.key);

        print('Plugins', s.plugins.map(function (p) {
          return p.name;
        }).join(', '));

        print('Current version', s.version);
        print('Last updated at', s.timestamp);
      })

      .catch(function (error) {
        console.log('Failed to show subscription(s): %s', error.message);
        console.error(error.stack);
      })

      .finally(shutdown);

  });


program
  .command('remove <subscriptions>')
  .description('Remove the given subscription(s)')

  .action(function remove(ids) {
    ids = ids.split(',');

    var question =
      'Remove ' + ids.length + ' subscription(s). Proceed? ';

    user.confirm(question)(function (error, ok) {
      if (error) console.error(error.message);

      if (!ok) {
        console.log('No subcriptions removed.');
        return shutdown();
      }

      B.map(ids, function (id) {
        return Subscription
          .load(id)
          .then(function (s) { return s.destroy(); });
      })
        .tap(function (subscriptions) {
          console.log('%d subscription(s) removed.', subscriptions.length);
        })

        .catch(function (error) {
          console.log('Failed to remove subscription(s): %s', error.message);
          console.error(error.stack);
        })

        .finally(shutdown);
    });
  });

program.parse(process.argv);

