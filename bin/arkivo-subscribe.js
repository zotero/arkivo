#!/usr/bin/env node

require('gnode');

var program = require('commander');
var Subscription = require('../lib/subscription');

program
  .version(require('../package.json').version);

program
  .command('list')
  .option('-k, --keys', 'show Zotero API keys in output')
  .description('list all subscription')

  .action(function () {

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

program.parse(process.argv);

