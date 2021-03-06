import { strict as assert } from 'assert';
import Koa  from 'koa';
import axios from 'axios';
import { Server } from 'http';
import { feathers, Id } from '@feathersjs/feathers';
import { Service, restTests } from '@feathersjs/tests';
import { koa, rest, Application, bodyParser, errorHandler } from '../src';

describe('@feathersjs/koa', () => {
  let app: Application;
  let server: Server;

  before(async () => {
    app = koa(feathers());
    app.use(errorHandler());
    app.use(bodyParser());
    app.use(rest());
    app.use('/', new Service());
    app.use('todo', new Service(), {
      methods: [
        'get', 'find', 'create', 'update',
        'patch', 'remove', 'customMethod'
      ]
    });
    app.use(ctx => {
      if (ctx.request.path === '/middleware') {
        ctx.body = {
          feathers: ctx.feathers,
          message: 'Hello from middleware'
        };
      }
    });

    server = await app.listen(8465);
  });

  after(() => server.close());

  it('throws an error when initialized with invalid application', () => {
    try {
      koa({} as Application);
      assert.fail('Should never get here');
    } catch (error) {
      assert.equal(error.message, '@feathersjs/koa requires a valid Feathers application instance');
    }
  });

  it('returns Koa instance when no Feathers app is passed', () => {
    assert.ok(koa() instanceof Koa);
  });

  it('Koa wrapped and context.app are the same', async () => {
    const app = koa(feathers());
    
    app.use('/test', {
      async get (id: Id) {
        return { id };
      }
    });

    app.service('test').hooks({
      before: {
        get: [context => {
          assert.ok(context.app === app);
        }]
      }
    });

    assert.deepStrictEqual(await app.service('test').get('testing'), {
      id: 'testing'
    });
  });

  it('starts as a Koa and Feathers application', async () => {
    const { data } = await axios.get('http://localhost:8465/middleware');
    const todo = await app.service('todo').get('dishes', {
      query: {}
    });

    assert.deepEqual(data, {
      message: 'Hello from middleware',
      feathers: {
        provider: 'rest'
      }
    });
    assert.deepEqual(todo, {
      id: 'dishes',
      description: 'You have to do dishes!'
    });
  });

  it('works with custom methods that are allowed', async () => {
    const { data } = await axios.post('http://localhost:8465/todo', {
      message: 'Custom hello'
    }, {
      headers: {
        'X-Service-Method': 'customMethod'
      }
    });
    
    assert.deepStrictEqual(data, {
      data: { message: 'Custom hello' },
      method: 'customMethod',
      provider: 'rest'
    });

    await assert.rejects(() => axios.post('http://localhost:8465/todo', {}, {
      headers: {
        'X-Service-Method': 'internalMethod'
      }
    }), error => {
      const { data } = error.response;

      assert.strictEqual(data.code, 405);
      assert.strictEqual(data.message, 'Method `internalMethod` is not supported by this endpoint.');
      
      return true;
    })
  });

  restTests('Services', 'todo', 8465);
  restTests('Root service', '/', 8465);
});
