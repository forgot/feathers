import { strict as assert } from 'assert';
import feathers from '@feathersjs/feathers';
import { Service } from '@feathersjs/tests/lib/fixture';
import { crud } from '@feathersjs/tests/lib/crud';
import { koa, rest, Application, bodyParser } from '../src';
import { Server } from 'http';
import axios from 'axios';

describe('@feathersjs/koa', () => {
  let app: Application;
  let server: Server;

  before(async () => {
    app = koa(feathers());
    app.use(bodyParser());
    app.use(rest());
    app.use('/', Service);
    app.use('todo', Service);
    app.use(ctx => {
      if (ctx.request.path === '/middleware') {
        ctx.body = {
          feathers: ctx.feathers,
          message: 'Hello from middleware'
        };
      }
    });

    server = app.listen(8465);

    await new Promise(resolve =>
      server.once('listening', () => resolve())
    );
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

  it('starts as a Koa and Feathers application', async () => {
    const { data } = await axios.get('http://localhost:8465/middleware');
    const todo = await app.service('todo').get('dishes');

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

  crud('Services', 'todo', 8465);
  crud('Root service', '/', 8465);
});
