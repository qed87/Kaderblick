import Fastify, { type FastifyInstance } from 'fastify';
import app from '../../src/app.ts';
import type { Config } from '../../src/config.ts';
import configPlugin from '../../src/plugins/config.ts';

export const TEST_VERSION = '1.2.3-test';

export const testConfig: Config = {
  trainersFile: '/config/trainers.json',
  sessionKey: '0'.repeat(64),
  kurrentDbUrl: 'kurrentdb://localhost:2113?tls=false',
  kurrentDbHttpUrl: 'http://localhost:2113',
  dataDir: '/data',
  port: 8080,
  trustProxy: false,
  logLevel: 'silent',
  nodeEnv: 'test',
  trainers: [{ trainerId: 'max.muster@example.org', name: 'Max Muster', accessKey: 'a'.repeat(32) }],
};

/** Baut die App wie server.ts, aber ohne Port und mit Testkonfiguration. */
export async function buildTestApp(overrides: Partial<Config> = {}): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });
  await fastify.register(configPlugin, { config: { ...testConfig, ...overrides } });
  await fastify.register(app, { version: TEST_VERSION });
  await fastify.ready();
  return fastify;
}
