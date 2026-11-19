import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import packageJson from '../package.json' with { type: 'json' };
import errorHandler from './plugins/errorHandler.ts';
import systemRoutes from './routes/system.ts';

const API_PREFIX = '/api/v1';

async function app(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  await fastify.register(errorHandler);

  // Keine Antwort landet im Browser-Cache (Spezifikation 6.1.4).
  fastify.addHook('onRequest', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
  });

  if (fastify.config.nodeEnv === 'development') {
    await fastify.register(swagger, {
      openapi: { info: { title: 'Kaderblick API', version: packageJson.version } },
      transform: jsonSchemaTransform,
    });
    await fastify.register(swaggerUi, { routePrefix: `${API_PREFIX}/docs` });
  }

  await fastify.register(systemRoutes, { prefix: API_PREFIX, version: packageJson.version });
}

export default fp(app, { name: 'kaderblick-app', dependencies: ['kaderblick-config'] });
