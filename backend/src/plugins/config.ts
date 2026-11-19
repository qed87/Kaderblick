import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import type { Config } from '../config.ts';

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
  }
}

export type ConfigPluginOptions = { config: Config };

async function configPlugin(fastify: FastifyInstance, opts: ConfigPluginOptions) {
  fastify.decorate('config', opts.config);
}

export default fp(configPlugin, { name: 'kaderblick-config' });
