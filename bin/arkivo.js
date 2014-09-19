#!/usr/bin/env node

var program = require('commander');
var tabtab  = require('tabtab');

program
  .version(require('../package.json').version)

  .command('start', 'Start the Arkivo service')
  .command('plugins', 'Manage Arkivo plugins')

  .command('subscriptions', 'Manage Zotero URL subscriptions')
  .command('sync', 'Synchronize one or more subscriptions');


// --- Tab-Completion ---

if (process.argv[2] === 'completion') {
  return tabtab.complete('arkivo', function (error, data) {
    if (error || !data) return undefined;

    function to_long(o)  { return o.long;  }
    function to_short(o) { return o.short; }
    function to_name(o)  { return o._name; }

    if ((/^--/).test(data.last))
      return tabtab.log(program.options.map(to_long), data, '--');

    if ((/^-/).test(data.last))
      return tabtab.log(program.options.map(to_short), data, '-');

    tabtab.log(program.commands.map(to_name), data);
  });
}

program.parse(process.argv);
