import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { KurrentDBClient } from '@kurrent/kurrentdb-client';
import { buildTestApp } from './helpers/app.ts';

describe('KurrentDB-Plugin', () => {
  it('stellt den Client bereit und gibt ihn beim Schließen frei, ohne vorher zu verbinden', async () => {
    const fastify = await buildTestApp();
    assert.ok(fastify.kurrentDb instanceof KurrentDBClient);
    await fastify.close();
  });
});
