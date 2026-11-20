import { After, setWorldConstructor, World } from '@cucumber/cucumber';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { buildTestApp } from '../../test/helpers/app.ts';
import { TeamScenario } from './teamScenario.ts';

/**
 * Gemeinsamer Zustand eines Szenarios. Domänen-Szenarien nutzen `team`; API-Szenarien die App,
 * die erst bei der ersten Anfrage gestartet wird.
 */
export class KaderblickWorld extends World {
  readonly team = new TeamScenario();

  #app: FastifyInstance | undefined;
  #response: LightMyRequestResponse | undefined;

  get response(): LightMyRequestResponse {
    if (!this.#response) throw new Error('Es wurde noch keine Anfrage gestellt.');
    return this.#response;
  }

  async request(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', url: string): Promise<void> {
    this.#app ??= await buildTestApp();
    this.#response = await this.#app.inject({ method, url });
  }

  async stop(): Promise<void> {
    await this.#app?.close();
  }
}

setWorldConstructor(KaderblickWorld);

After(async function (this: KaderblickWorld) {
  await this.stop();
});
