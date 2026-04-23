'use strict';

require('dotenv').config();

const { cleanEnv, str, port } = require('envalid');

const env = cleanEnv(process.env, {
  NODE_ENV: str({
    default: 'development',
    choices: ['development', 'production', 'test'],
  }),
  PORT: port({
    default: 3003,
    desc:    'HTTP port for the server',
  }),
  DATABASE_URL: str({
    desc: 'PostgreSQL connection string (Prisma format)',
  }),
  API_KEY: str({
    desc: 'Static API key — mobile clients must send via X-API-Key header',
  }),
  SESSION_SECRET: str({
    desc: 'Secret used to sign session cookies — must be long & random in production',
  }),
});

module.exports = { env };
