import Fastify from 'fastify';
import app from './app.ts';
import { describeConfigError, loadConfig } from './config.ts';
import configPlugin from './plugins/config.ts';

const config = await loadConfig(process.env).match(
  (loaded) => loaded,
  (error) => {
    // Ohne gültige Konfiguration gibt es noch keinen Logger; der Start bricht hier ab.
    throw new Error(describeConfigError(error));
  },
);

const fastify = Fastify({
  logger: { level: config.logLevel },
  trustProxy: config.trustProxy,
});

await fastify.register(configPlugin, { config });
await fastify.register(app);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    fastify.log.info({ signal }, 'Backend wird beendet');
    fastify.close().then(
      () => process.exit(0),
      (error: unknown) => {
        fastify.log.error({ err: error }, 'Fehler beim Beenden');
        process.exit(1);
      },
    );
  });
}

await fastify.listen({ port: config.port, host: '0.0.0.0' });
