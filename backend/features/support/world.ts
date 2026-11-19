import { After, Before, setWorldConstructor, World } from '@cucumber/cucumber';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { buildTestApp } from '../../test/helpers/app.ts';

/** Gemeinsamer Zustand eines Szenarios: die App und die letzte Antwort. */
export class KaderblickWorld extends World {
  #app: FastifyInstance | undefined;
  #response: LightMyRequestResponse | undefined;

  get app(): FastifyInstance {
    if (!this.#app) throw new Error('Die App ist nicht gestartet.');
    return this.#app;
  }

  get response(): LightMyRequestResponse {
    if (!this.#response) throw new Error('Es wurde noch keine Anfrage gestellt.');
    return this.#response;
  }

  async start(): Promise<void> {
    this.#app = await buildTestApp();
  }

  async stop(): Promise<void> {
    await this.#app?.close();
  }

  async request(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', url: string): Promise<void> {
    this.#response = await this.app.inject({ method, url });
  }
}

setWorldConstructor(KaderblickWorld);

Before(async function (this: KaderblickWorld) {
  await this.start();
});

After(async function (this: KaderblickWorld) {
  await this.stop();
});
