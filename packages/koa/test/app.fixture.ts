import memory from 'feathers-memory';
import feathers, { Params, HookContext } from '@feathersjs/feathers';
import { authenticate, AuthenticationService, JWTStrategy } from '@feathersjs/authentication';
import { LocalStrategy, hooks } from '@feathersjs/authentication-local';

import { koa, rest, bodyParser, errorHandler } from '../src';

const { protect, hashPassword } = hooks;
const app = koa(feathers());
const authentication = new AuthenticationService(app);

app.use(bodyParser());
app.use(rest());
app.set('authentication', {
  entity: 'user',
  service: 'users',
  secret: 'supersecret',
  authStrategies: [ 'local', 'jwt' ],
  parseStrategies: [ 'jwt' ],
  local: {
    usernameField: 'email',
    passwordField: 'password'
  }
});

authentication.register('jwt', new JWTStrategy());
authentication.register('local', new LocalStrategy());

app.use('/authentication', authentication);
app.use('/users', memory({
  paginate: {
    default: 10,
    max: 20
  }
}));

app.service('users').hooks({
  before: {
    create: [
      (context: HookContext) => {
        console.log('MOFO', context.app.defaultAuthentication, app.defaultAuthentication);
        console.log(app === context.app);
      },
      hashPassword('password')
    ]
  },
  after: {
    all: protect('password'),
    get: [(context: HookContext) => {
      if (context.params.provider) {
        context.result.fromGet = true;
      }

      return context;
    }]
  }
});

app.use('/dummy', {
  async get (id: string, params: Params) {
    return { id, params };
  }
});

app.service('dummy').hooks({
  before: [ authenticate('jwt') ]
});

app.use(errorHandler());

export default app;
