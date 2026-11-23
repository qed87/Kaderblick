import { KurrentDBClient } from '@kurrent/kurrentdb-client';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    kurrentDb: KurrentDBClient;
  }
}

/**
 * Stellt den KurrentDB-Client bereit. Der Client verbindet sich erst bei der ersten Anfrage;
 * beim Schließen der App wird er freigegeben.
 */
async function kurrentDbPlugin(fastify: FastifyInstance) {
  const client = KurrentDBClient.connectionString(fastify.config.kurrentDbUrl);
  fastify.decorate('kurrentDb', client);
  fastify.addHook('onClose', async () => {
    await client.dispose();
  });
}

export default fp(kurrentDbPlugin, { name: 'kaderblick-kurrentdb', dependencies: ['kaderblick-config'] });
