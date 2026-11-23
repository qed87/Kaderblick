import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import errorHandler from './plugins/errorHandler.ts';
import kurrentDb from './plugins/kurrentDb.ts';
import systemRoutes from './routes/system.ts';

const API_PREFIX = '/api/v1';

export type AppOptions = { version: string };

async function app(fastify: FastifyInstance, opts: AppOptions) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  await fastify.register(errorHandler);
  await fastify.register(kurrentDb);

  // Keine Antwort landet im Browser-Cache (Spezifikation 6.1.4).
  fastify.addHook('onRequest', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
  });

  if (fastify.config.nodeEnv === 'development') {
    await fastify.register(swagger, {
      openapi: { info: { title: 'Kaderblick API', version: opts.version } },
      transform: jsonSchemaTransform,
    });
    await fastify.register(swaggerUi, { routePrefix: `${API_PREFIX}/docs` });
  }

  await fastify.register(systemRoutes, { prefix: API_PREFIX, version: opts.version });
}

export default fp(app, { name: 'kaderblick-app', dependencies: ['kaderblick-config'] });
