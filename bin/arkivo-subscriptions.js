#!/usr/bin/env node
'use strict';


// --- Dependencies ---

var B       = require('bluebird');
var program = require('commander');
var cp      = require('co-prompt');

var arkivo = require('..');
var common = require('../lib/common');

var Subscription = arkivo.Subscription;
var capitalize = common.capitalize;


// --- Global Options ---

program
  .version(arkivo.version)

  .option('-v, --verbose', 'increase verbosity', verbosity, 0)
  .option('-k, --keys', 'show Zotero API keys in output')
  .option('-r, --redis <host:port>', 'configure the Redis connection', redis);


// --- Commands ---

program
  .command('list')
  .alias('ls')
  .description('List all subscriptions')

  .action(function list() {

    var print = program.keys ?
      function (s) { console.log('  %s %s %s', s.id, s.url, s.key); } :
      function (s) { console.log('  %s %s', s.id, s.url); };

    Subscription
      .all()
      .tap(num('found'))
      .each(print)
      .tap(shutdown)

      .catch(backtrace('Failed to list subscriptions'));
  });


program
  .command('show [subscriptions]')
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

    function separate() { console.log(''); }

    Subscription
      .find(ids)
      .tap(num('found'))

      .each(function (s, idx) {
        if (idx) separate();

        print('Subscription', s.id);
        print('Zotero URL', s.url);

        if (program.keys)
          print('API key', s.key);

        print('Plugins', JSON.stringify(s.plugins));

        print('Current version', s.version);
        print('Last updated at', s.timestamp);
      })

      .tap(shutdown)

      .catch(backtrace('Failed to show subscription(s)'));
  });


program
  .command('remove [subscriptions]')
  .alias('rm')
  .description('Remove the given subscription(s)')

  .action(function remove(ids) {
    Subscription
      .find(ids)

      .then(confirmable('remove', function (s) {
        return s.destroy();
      }))

      .tap(num('removed'))
      .tap(shutdown)

      .catch(backtrace('Failed to remove subscription(s)'));
  });

program
  .command('reset <subscriptions>')
  .description('Reset the given subscription(s)')

  .action(function reset(ids) {
    Subscription
      .find(ids)

      .then(confirmable('reset', function (s) {
        return s.reset().save();
      }))

      .tap(num('reset'))

      .tap(shutdown)

      .catch(backtrace('Failed to reset subscription(s)'));
  });

program
  .command('add <url>')
  .description('Subscribe to the given Zotero URL')

  .option('-K, --key <key>', 'set Zotero API key')
  .option('-P, --plugins <plugin>[:<options>]',
    'add plugin by name', plugins, [])

  .action(function add(url, options) {
    var s = new Subscription({ url: url });

    if (options.key) s.key = options.key;

    if (options.plugins.length) {
      options.plugins.forEach(function (plugin) {

        if (!arkivo.plugins.available[plugin.name])
          console.log('Warning: plugin %s not found', plugin.name);

        s.plugins.push(plugin);
      });
    }

    s.save()
      .tap(function () {
        console.log('Subscription added as "%s".', s.id);
      })

      .tap(shutdown)
      .catch(backtrace('Failed to add subscription'));
  });

program.parse(process.argv);

if (!program.args.length) program.help();


// --- Helper Functions ---

function shutdown() {
  Subscription.db.reset();
  process.stdin.destroy();
}

function num(action) {
  return function (s) {
    console.log('%d subscription(s) %s.', s.length, action);
  };
}

function backtrace(message) {
  return function (e) {
    console.error([message, e.message].join(': '));

    if (program.verbose) console.error(e.stack);

    process.exit(1);
  };
}

function plugins(string, list) {
  var p = {};

  var m = (/^(\w+)(:(.+))?/).exec(string);
  if (!m) throw new Error('invalid plugin: ' + string);

  p.name = m[1];

  if (m[3])
    p.options = JSON.parse('{' + m[3] + '}');

  list.push(p);

  return list;
}

function confirm(question) {
  return new B(function (resolve, reject) {
    cp.confirm(question + ' Proceed? ')(function (e, ok) {
      if (e) return reject(e);
      resolve(ok);
    });
  });
}

function confirmable(method, action) {
  return function (ss) {
    var question =
      [capitalize(method), ss.length, 'subscription(s).'].join(' ');

    return confirm(question)
      .then(function (ok) {
        return B.each(ok ? ss : [], action);
      });
  };
}

function redis(input) {
  var cfg = input.split(':');

  if (cfg[0]) arkivo.config.redis.host = cfg[0];
  if (cfg[1]) arkivo.config.redis.port = cfg[1];

  return cfg;
}

function verbosity(v, total) {
  return total + 1;
}
