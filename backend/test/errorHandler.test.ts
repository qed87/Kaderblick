import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import Fastify, { type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import errorHandler from '../src/plugins/errorHandler.ts';

type Problem = { type: string; title: string; status: number; detail: string; errors?: { field: string }[] };

describe('Fehlerformat (Problem Details)', () => {
  let fastify: FastifyInstance;

  before(async () => {
    fastify = Fastify({ logger: false });
    fastify.setValidatorCompiler(validatorCompiler);
    fastify.setSerializerCompiler(serializerCompiler);
    await fastify.register(errorHandler);
    const typed = fastify.withTypeProvider<ZodTypeProvider>();
    typed.post(
      '/echo',
      { schema: { body: z.object({ name: z.string().min(1), tier: z.object({ level: z.number() }) }) } },
      (request) => request.body,
    );
    typed.get('/boom', () => {
      throw new Error('geheimes internes Detail');
    });
    await fastify.ready();
  });

  after(() => fastify.close());

  it('liefert ValidationError mit errors je Feld', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/echo',
      payload: { name: '', tier: { level: 'x' } },
    });
    assert.equal(response.statusCode, 400);
    assert.match(response.headers['content-type'] ?? '', /^application\/problem\+json/);
    const body = response.json<Problem>();
    assert.equal(body.type, 'ValidationError');
    assert.equal(body.status, 400);
    assert.deepEqual(body.errors?.map((e) => e.field).sort(), ['name', 'tier.level']);
  });

  it('liefert ValidationError bei ungültigem JSON', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      payload: '{ kein json',
    });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json<Problem>().type, 'ValidationError');
  });

  it('liefert UnsupportedMediaType bei nicht unterstütztem Format', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/xml' },
      payload: '<x/>',
    });
    assert.equal(response.statusCode, 415);
    assert.equal(response.json<Problem>().type, 'UnsupportedMediaType');
  });

  it('liefert NotFound für unbekannte Endpunkte', async () => {
    const response = await fastify.inject({ method: 'GET', url: '/gibt-es-nicht' });
    assert.equal(response.statusCode, 404);
    assert.match(response.headers['content-type'] ?? '', /^application\/problem\+json/);
    assert.equal(response.json<Problem>().type, 'NotFound');
  });

  it('liefert InternalError ohne interne Details', async () => {
    const response = await fastify.inject({ method: 'GET', url: '/boom' });
    assert.equal(response.statusCode, 500);
    assert.deepEqual(Object.keys(response.json<Problem>()).sort(), ['detail', 'status', 'title', 'type']);
    assert.equal(response.json<Problem>().type, 'InternalError');
    assert.doesNotMatch(response.body, /geheimes internes Detail/);
  });
});
