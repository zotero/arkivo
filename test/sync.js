//var sinon = require('sinon');
var chai   = require('chai');
var sinon  = require('sinon');
var expect = chai.expect;

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

var B = require('bluebird');

var plugins = require('../lib/plugins');

var Subscription = require('../lib/subscription');
var Synchronizer = require('../lib/sync');

var Session          = Synchronizer.Session;
var InterruptedError = Synchronizer.InterruptedError;
var sync             = Synchronizer.instance;

function delayed() { return B.delay(0); }

describe('Synchronizer', function () {
  it('is a constructor', function () {
    expect(Synchronizer).to.be.an('function');
  });

  it('has a singleton instance', function () {
    expect(sync).to.be.instanceof(Synchronizer);
  });

  describe('#synchronize', function () {
    var sub, version;

    beforeEach(function () {
      version = 1;
      sub = new Subscription({ url: '/users/42/items', version: version });

      sinon.stub(sub, 'save', delayed);
      sinon.spy(sub, 'touch');
      sinon.stub(sub, 'update');

      sinon.stub(Session.prototype, 'execute', function () {
        this.version = version;
        return delayed();
      });

      sinon.stub(sync, 'dispatch', delayed);
    });

    afterEach(function () {
      Session.prototype.execute.restore();
      sync.dispatch.restore();
    });

    it('returns a promise for Session instance', function () {
      return expect(sync.synchronize(sub))
        .to.eventually.be.instanceof(Session);
    });

    it('touches and saves the subscription', function () {
      expect(sub.touch).to.not.have.been.called;
      expect(sub.save).to.not.have.been.called;
      expect(sub.update).to.not.have.been.called;

      return sync.synchronize(sub)
        .then(function () {
          expect(sub.touch).to.have.been.called;
          expect(sub.save).to.have.been.called;
          expect(sub.update).to.not.have.been.called;
        });
    });

    it('passes the skip option on to the synchronization', function () {
      expect(Session.prototype.execute).to.not.have.been.called;

      return B.all([
          sync.synchronize(sub),
          sync.synchronize(sub, true),
        ])
        .then(function () {
          var execute = Session.prototype.execute;

          expect(execute).to.have.been.calledTwice;

          expect(!!execute.args[0][0]).to.be.false;
          expect(execute.args[1][0]).to.be.true;
        });
    });

    describe('when there are modifications', function () {
      beforeEach(function () {
        version = 42;
        //Session.prototype.version = 42;
      });
      afterEach(function () {
        //delete Session.prototype.version;
      });

      it('updates the subscription', function () {
        return sync.synchronize(sub)
          .then(function (s) {
            expect(sub.update).to.have.been.called;
            expect(sub.update.args[0][0]).to.have.property('version', 42);
          });
      });

      it('dispatches modified data to plugins', function () {
        return sync.synchronize(sub)
          .then(function () {
            expect(sync.dispatch).to.have.been.called;
          });
      });

      it('skips plugins if skip argument is true', function () {
        return sync.synchronize(sub, true)
          .then(function () {
            expect(sync.dispatch).to.not.have.been.called;
          });
      });
    });

    it('skips plugins if not modified', function () {
      return sync.synchronize(sub)
        .then(function () {
          expect(sync.dispatch).to.not.have.been.called;
        });
    });
  });

  describe('#update', function () {
    beforeEach(function () {
      sinon.stub(sync, 'synchronize', delayed);
    });

    afterEach(function () {
      sync.synchronize.restore();
    });

    it('delegates to .synchronize with skip set to true', function () {
      var sub = {};

      return sync.update(sub).then(function () {
        expect(sync.synchronize).to.have.been.called;

        expect(sync.synchronize.args[0][0]).to.equal(sub);
        expect(sync.synchronize.args[0][1]).to.be.true;
      });
    });
  });

  describe('#dispatch', function () {
    var data;

    beforeEach(function () {
      data = new Session(new Subscription());
      data.version = 1;
    });

    it('works when there are no plugins', function () {
      return expect(sync.dispatch(data)).to.be.fulfilled;
    });

    describe('when there are plugins', function () {
      var one, two;

      beforeEach(function () {
        one = sinon.stub().yields();
        two = sinon.stub();

        plugins.add({ name: 'one', process: one });
        plugins.add({ name: 'two', process: two });

        data.subscription.plugins.push({ name: 'one' });
      });

      afterEach(function () {
        plugins.reset();
      });

      it('dispatches the sync data to all plugins', function () {
        return sync.dispatch(data)
          .then(function () {
            expect(one).to.have.been.called;
            expect(one.args[0][0]).to.equal(data);

            expect(two).to.not.have.been.called;
          });
      });

      describe('but not all are available', function () {
        beforeEach(function () { plugins.reset(); });

        it('does not fail', function () {
          return expect(sync.dispatch(data)).to.be.fulfilled;
        });
      });

      describe('that return a promise', function () {
        var three;

        beforeEach(function () {
          three = sinon.stub().returns(B.delay(0));

          plugins.add({ name: 'three',  process: three });
          data.subscription.plugins.push({ name: 'three' });
        });

        it('works', function () {
          return sync.dispatch(data)
            .then(function () {
              expect(three).to.have.been.called;
            });
        });

        describe('if a plugin fails', function () {
          var four;

          beforeEach(function () {
            four = sinon.stub().returns(B.rejected());

            plugins.add({ name: 'four',  process: four });
            data.subscription.plugins.push({ name: 'four' });
          });

          it('fails', function () {
            return expect(sync.dispatch(data)).to.eventually.be.rejected;
          });
        });
      });
    });
  });

});

describe('Session', function () {
  var session;

  it('is a constructor', function () {
    expect(Session).to.be.an('function');
  });

  it('it uses its subscription\'s id', function () {
    session = new Session();

    expect(session.id).to.be.undefined;

    session.subscription = { id: 3 };
    expect(session.id).to.eql(3);
  });

  describe('#execute', function () {
    beforeEach(function () {
      session = new Session(new Subscription());

      sinon.stub(session, 'update', delayed);
      sinon.stub(session, 'download', delayed);
    });

    it('updates the session', function () {
      expect(session.update).to.not.have.been.called;

      return B.all([
          session.execute(),
          session.execute(true)
        ]).then(function () {
          expect(session.update).to.have.been.calledTwice;
        });
    });

    it('downloads items unless skip option is set', function () {
      expect(session.download).to.not.have.been.called;

      return B.all([
          session.execute(),
          session.execute(true)
        ]).then(function () {
          expect(session.download).to.have.been.calledOnce;
        });
    });

    describe('when interrupted', function () {
      var max = 2;

      beforeEach(function () {
        session.update.restore();

        sinon.stub(session, 'update', function () {
          return delayed().then(function () {
            if (--max) {
              var e =  new InterruptedError('interrupted');
              e.resume = 0;
              throw e;
            }
          });
        });

        sinon.spy(session, 'execute');
      });

      it('retries execution if interrupted', function () {
        expect(session.execute).to.not.have.been.called;

        return expect(
          session.execute().tap(function () {
            expect(session.execute).to.have.been.calledTwice;
          })
        ).to.eventually.be.fulfilled;
      });

      it('fails after max retries', function () {
        max = 3;

        return expect(session.execute(true, 1))
          .to.eventually.be.rejectedWith(InterruptedError);
      });
    });

    describe('when an error occurs', function () {
      beforeEach(function () {
        session.update.restore();
        sinon.stub(session, 'update', function () {
          return delayed().then(function () { throw  new Error('failed'); });
        });
      });

      it('fails', function () {
        return expect(session.execute())
          .to.eventually.be.rejectedWith(Error, 'failed');
      });
    });
  });

  describe('#update', function () {
    beforeEach(function () {
      session = new Session(new Subscription({
        url: '/users/23/items'
      }));

      sinon.spy(session, 'diff');
    });

    describe('when the message is not modified', function () {
      beforeEach(function () {
        sinon.stub(session, 'get', function () {
          var m = new FakeMessage();
          m.unmodified = true;

          return delayed().then(function () { return m; });
        });
      });

      it('returns the session as not modified', function () {
        return expect(session.update())
          .to.eventually.equal(session)
          .and.to.have.property('modified', false);
      });

      it('does not call #diff', function () {
        return session.update().then(function () {
          expect(session.diff).to.not.have.been.called;
        });
      });
    });

    describe('when the message is not JSON', function () {
      beforeEach(function () {
        sinon.stub(session, 'get', function () {
          var m = new FakeMessage();
          m.type = 'text/html';

          return delayed().then(function () { return m; });
        });
      });

      it('fails with an assertion error', function () {
        return expect(session.update())
          .to.eventually.be.rejectedWith(Error);
      });
    });

    describe('when the message is modified', function () {
      var more = 0, interrupt = false;

      beforeEach(function () {
        sinon.stub(session, 'get', function () {
          return delayed().then(function () {
            return new FakeMessage(1, more, interrupt);
          });
        });
      });

      it('returns the session as modified', function () {
        return expect(session.update())
          .to.eventually.equal(session)
          .and.to.have.property('modified', true);
      });

      it('falls #get with format=versions and limit', function () {
        return session.update().then(function () {
          expect(session.get).to.have.been.called;
          expect(session.get.args[0][0]).to.eql('/users/23/items');
          expect(session.get.args[0][1]).to.have.property('format', 'versions');
          expect(session.get.args[0][1]).to.have.property('limit');
        });
      });

      it('updates the session version', function () {
        return expect(session.update())
          .to.eventually.have.property('version', 1);
      });

      it('calls #diff', function () {
        return session.update().then(function () {
          expect(session.diff).to.have.been.called;
        });
      });

      describe('and a multi response', function () {
        beforeEach(function () { more = 2; });

        it('returns the session as modified', function () {
          return expect(session.update())
            .to.eventually.equal(session)
            .and.to.have.property('modified', true);
        });

        it('updates the session version', function () {
          return expect(session.update())
            .to.eventually.have.property('version', 1);
        });

        describe('and interrupted', function () {
          beforeEach(function () { interrupt = true; });

          it('fails with an interrupt', function () {
            return expect(session.update())
              .to.eventually.be.rejectedWith(InterruptedError);
          });
        });
      });
    });
  });

  describe('#download', function () {
    beforeEach(function () {
      session = new Session(new Subscription({
        url: '/users/23/collection/x/items'
      }));

      session.versions = { foo: 1, bar: 1, baz: 1 };

      session.created = ['bar'];
      session.updated = ['foo', 'baz'];

      sinon.stub(session, 'get', function (_, options) {
        var m = new FakeMessage(1);

        if (options.itemKey) {
          m.data = options.itemKey.split(',').map(function (key) {
            return { key: key, version: 1 };
          });
        }

        return delayed().then(function () { return m; });
      });
    });

    it('downloads all created/updated items', function () {
      return expect(session.download())
        .to.eventually.have.property('items')
        .and.to.have.keys(['foo', 'bar', 'baz']);
    });

    it('breaks early if there are no updated/created items', function () {
      session.created.length = 0;
      session.updated.length = 0;

      return session.download()
        .then(function (s) {
          expect(s).to.equal(session);
          expect(session.get).to.not.have.been.called;
        });
    });

    it('breaks early if all items are up-to-date', function () {
      session.items = {
        foo: { version: 1 },
        bar: { version: 1 },
        baz: { version: 1 }
      };

      return session.download()
        .then(function (s) {
          expect(s).to.equal(session);
          expect(session.get).to.not.have.been.called;
        });
    });

    it('skips up-to-date items', function () {
      session.versions.foo = 0;
      session.items.foo = { version: 0 };

      return expect(session.download())
        .to.eventually.have.property('items')
        .and.to.have.keys(['foo', 'bar', 'baz'])
        .and.to.have.deep.property('foo.version', 0);
    });

    it('calls get with format=json and item keys', function () {
      return session.download()
        .then(function () {
          expect(session.get).to.have.been.called;
          expect(session.get.args[0][0]).to.eql('/users/23/items');
          expect(session.get.args[0][1]).to.have.property('format', 'json');

          expect(session.get.args[0][1])
            .to.have.property('itemKey')
            .and.to.match(/^(\w+,){2}\w+$/);
        });
    });
  });

  describe('#get', function () {
    beforeEach(function () {
      sinon.stub(sync.zotero, 'get');
      session = new Session(new Subscription());
    });

    afterEach(function () {
      sync.zotero.get.restore();
    });

    it('delegates to synchronizer\'s zotero client', function () {
      expect(sync.zotero.get).to.not.have.been.called;
      session.get('foo');

      expect(sync.zotero.get).to.have.been.calledWith('foo');
    });

    it('uses subscription\'s path by default', function () {
      session.subscription.url = '/users/42/items';
      session.get();

      expect(sync.zotero.get).to.have.been.calledWith('/users/42/items');
    });
  });

  describe('#check', function () {
    beforeEach(function () { session = new Session(); });

    it('returns true if the session has no version yet', function () {
      expect(session.check()).to.be.true;
      expect(session.check(42)).to.be.true;
    });

    it('returns true if the versions match', function () {
      session.version = 42;
      expect(session.check(42)).to.be.true;
    });

    it('throws InterruptedError if versions do not match', function () {
      session.version = 42;
      expect(session.check.bind(session, 23)).to.throw(InterruptedError);
    });
  });

  describe('#diff', function () {
    beforeEach(function () {
      session = new Session();
    });

    it('detects created items', function () {
      session.diff({ a: 1, b: 2, c: 4 }, { a: 1, b: 2 });
      expect(session.created).to.eql(['c']);
    });

    it('detects updated items', function () {
      session.diff({ a: 1, b: 3, c: 4 }, { a: 1, b: 2 });
      expect(session.updated).to.eql(['b']);
    });

    it('detects deleted items', function () {
      session.diff({ a: 1, c: 4 }, { a: 1, b: 2 });
      expect(session.deleted).to.eql(['b']);
    });

    it('returns empty CRUD lists when items stay the same', function () {
      session.diff({ a: 1, b: 2 }, { a: 1, b: 2 });

      expect(session.created).to.empty;
      expect(session.updated).to.empty;
      expect(session.deleted).to.empty;
    });
  });

  // --- Test Helpers ---

  function FakeMessage(version, more, interrupt) {
    this.version   = version || 1;
    this.more      = more || 0;
    this.done      = this.more < 1;
    this.interrupt = interrupt;

    this.multi    = true;
    this.unmodified = false;
    this.type = 'json';

    this.data = {};
  }

  FakeMessage.prototype.next = function () {
    var m = this.interrupt ?
      new FakeMessage(++this.version, --this.more) :
      new FakeMessage(this.version, --this.more);

    return delayed().then(function () { return m; });
  };
});
