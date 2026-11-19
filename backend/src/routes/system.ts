import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

export type SystemRoutesOptions = { version: string };

const systemRoutes: FastifyPluginAsyncZod<SystemRoutesOptions> = async (fastify, opts) => {
  fastify.get(
    '/version',
    {
      schema: {
        summary: 'Version des Backends (ohne Anmeldung)',
        response: { 200: z.object({ version: z.string() }) },
      },
    },
    () => ({ version: opts.version }),
  );
};

export default systemRoutes;
