import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import packageJson from '../../package.json' with { type: 'json' };
import type { KaderblickWorld } from '../support/world.ts';

When('a visitor asks for the backend version', async function (this: KaderblickWorld) {
  await this.request('GET', '/api/v1/version');
});

Then('the response status is {int}', function (this: KaderblickWorld, status: number) {
  assert.equal(this.response.statusCode, status);
});

Then('the response contains the version of the backend', function (this: KaderblickWorld) {
  assert.deepEqual(this.response.json(), { version: packageJson.version });
});
