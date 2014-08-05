
var Subscription = require('../lib/subscription');

if (process.argv.length < 3) {
  console.log('usage: node %s URL [KEY]\n', process.argv[1]);
  process.exit(1);
}

try {
  var s = new Subscription(process.argv[2], process.argv[3]);

  s.save();

  console.log('Subscription for URL %s saved', s.id);

} catch (error) {
  console.log('Subscription failed: %s', error.message);

} finally {
  Subscription.quit();
}
