
var Subscription = require('../lib/subscription');

if (process.argv.length < 3) {
  console.log('usage: node %s URL [KEY]\n', process.argv[1]);
  process.exit(1);
}

var s = new Subscription(process.argv[2], process.argv[3]);

s.save(function (error) {

  if (error)
    return console.log('Subscription failed: %s\n', error.message);
  else
    console.log('Subscription for URL %s saved\n', s.id);

  Subscription.quit();
});
