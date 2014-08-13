
var controller = require('../lib/controller').singleton;

if (process.argv.length < 3) {
  console.log('usage: node %s URL [KEY]\n', process.argv[1]);
  process.exit(1);
}


controller
  .subscribe({
    url: process.argv[2],
    key: process.argv[3]
  })

  .then(function (s) {
    console.log('Subscription saved as "%s"', s.id);
  })

  .catch(function (e) {
    console.log('Subscription failed: %s', e.message);
    console.error(e.stack);
  })

  .finally(function () {
    controller.shutdown();
  });
