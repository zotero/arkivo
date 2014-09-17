#!/usr/bin/env node

var program = require('commander');

program
  .version(require('../package.json').version)

  .command('start', 'Start the Arkivo service')
  .command('plugins', 'Manage Arkivo plugins')

  .command('subscriptions', 'Manage Zotero URL subscriptions')
  .command('sync', 'Synchronize one or more subscriptions')

  .parse(process.argv);
