#!/usr/bin/env node

require('gnode');

var program = require('commander');
var Subscription = require('../lib/subscription');

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
      });
  });

// add
// remove

program.parse(process.argv);

