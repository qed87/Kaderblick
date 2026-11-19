import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildTestApp } from './helpers/app.ts';

describe('App', () => {
  it('setzt Cache-Control: no-store auf allen Antworten', async () => {
    const fastify = await buildTestApp();
    try {
      for (const url of ['/api/v1/version', '/api/v1/gibt-es-nicht']) {
        const response = await fastify.inject({ method: 'GET', url });
        assert.equal(response.headers['cache-control'], 'no-store', url);
      }
    } finally {
      await fastify.close();
    }
  });

  it('bietet die OpenAPI-Beschreibung nur in der Entwicklung an', async () => {
    for (const [nodeEnv, expected] of [
      ['development', 200],
      ['production', 404],
    ] as const) {
      const fastify = await buildTestApp({ nodeEnv });
      try {
        const response = await fastify.inject({ method: 'GET', url: '/api/v1/docs/json' });
        assert.equal(response.statusCode, expected, nodeEnv);
      } finally {
        await fastify.close();
      }
    }
  });
});
