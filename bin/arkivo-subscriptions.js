#!/usr/bin/env node

require('gnode');

var program = require('commander');
var Subscription = require('../lib/subscription');

function shutdown() {
  Subscription.db.reset();
}

program
  .version(require('../package.json').version);

program
  .command('list')
  .description('list all subscription')

  .option('-k, --keys', 'show Zotero API keys in output')

  .action(function list() {

    var print = program.keys ?
      function (s) { console.log('  %s %s %s', s.id, s.url, s.key); } :
      function (s) { console.log('  %s %s', s.id, s.url); };

    Subscription
      .all()

      .then(function (subscriptions) {
        if (subscriptions.length) {
          subscriptions.forEach(print);

        } else {
          console.log('No subscriptions');
        }

        return subscriptions;
      })

      .catch(function (error) {
        console.log('Failed to list subscriptions: %s', error.message);
        console.error(error.stack);
      })

      .finally(shutdown);
  });

// add
// remove
// show

program.parse(process.argv);

