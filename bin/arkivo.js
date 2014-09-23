#!/usr/bin/env node
'use strict';

// --- Dependencies ---

require('gnode');

var debug    = require('debug')('arkivo');
//var B       = require('B');
var program = require('commander');
var tabtab  = require('tabtab');

var arkivo  = require('..');

var controller = arkivo.controller;

program
  .version(arkivo.version)
  .option('-r, --redis <host:port>', 'configure the Redis connection', redis);


// --- Command ---

program
  .command('up')
  .description('start the Arkivo service')

  .action(function up() {

    controller.start();

    process.once('SIGINT', function () {
      debug('sigterm received: shutting down...');

      controller
        .stop()
        .then(quit) // Can be removed with next Kue version

        .catch(function (e) {
          debug('failed to shut down gracefully: %s', e.message);
          debug(e.stack);

          process.exit(1);
        });
    });
  });


program
  .command('sync [subscriptions]')
  .description('synchronize the given subscriptions')

  .action(function sync(id) {
    arkivo
      .controller.synchronize(id)

      .tap(function (s) {
        console.log('%d subscription(s) synchronized', s.length);
      })

      .then(shutdown)

      .catch(function (e) {
        debug('Synchronization failed: %s', e.message);
        debug(e.stack);

        process.exit(1);
      });
  });

program
  .command('plugins', 'Manage Arkivo plugins')
  .command('subscriptions', 'Manage Zotero URL subscriptions');


// --- Helpers ---

function shutdown() {
  arkivo.db.reset();
  process.stdin.destroy();
}

function quit() { process.exit(0); }

function redis(input) {
  var cfg = input.split(':');

  if (cfg[0]) arkivo.config.redis.host = cfg[0];
  if (cfg[1]) arkivo.config.redis.port = cfg[1];

  return cfg;
}

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
