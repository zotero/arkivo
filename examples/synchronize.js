var sync = require('../lib/sync').singleton;

sync
  .process()

  .then(function (results) {
    console.log('Synchronization complete');
  })

  .catch(function (e) {
    console.log('Synchronization failed: %s', e.message);
    console.error(e.stack);
  });
