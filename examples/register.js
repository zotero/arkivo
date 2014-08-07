
var Subscription = require('../lib/subscription');

if (process.argv.length < 3) {
  console.log('usage: node %s URL [KEY]\n', process.argv[1]);
  process.exit(1);
}


Subscription.register(process.argv.slice(2, 4))

  .then(function (s) {
    console.log('Subscription for URL %s saved', s.id);
  })

  .catch(function (e) {
    console.log('Subscription failed: %s', e.message);
    console.error(e.stack);
  })

  .finally(function () {
    Subscription.disconnect();
  });
