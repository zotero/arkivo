module.exports = {
  q: {
    prefix: 'q',
    redis: {
      port: 6379,
      host: '127.0.0.1',
      options: {
        parser: 'hiredis'
      }
    }
  }
};
