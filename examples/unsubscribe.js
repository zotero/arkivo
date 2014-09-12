
var controller = require('../lib/controller').singleton;
var B = require('bluebird');

if (process.argv.length < 3) {
  console.log('usage: node %s ID\n', process.argv[1]);
  process.exit(1);
}

B
  .map(process.argv.slice(2), function (id) {
    console.log('Removing subscription "%s"...', id);

    return controller
      .unsubscribe(id)

      .tap(function (s) {
        console.log('Subscription "%s" removed successfully', s.id);
      });
  })

  .catch(function (e) {
    console.log('Failed to remove subscription(s): %s', e.message);
    console.error(e.stack);
  })

  .finally(function () {
    controller.shutdown();
  });

