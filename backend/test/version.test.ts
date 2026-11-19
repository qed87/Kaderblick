import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { loadVersion, parseVersion } from '../src/version.ts';

describe('loadVersion', () => {
  it('liest die Version aus package.json', async () => {
    const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as {
      version: string;
    };
    assert.equal((await loadVersion())._unsafeUnwrap(), packageJson.version);
  });

  it('meldet eine fehlende Datei', async () => {
    const error = (await loadVersion(new URL('./fehlt.json', import.meta.url)))._unsafeUnwrapErr();
    assert.equal(error.type, 'VersionUnreadable');
  });
});

describe('parseVersion', () => {
  it('meldet ungültiges JSON', () => {
    assert.equal(parseVersion('{ kein json')._unsafeUnwrapErr().type, 'VersionUnreadable');
  });

  it('meldet eine fehlende Version', () => {
    assert.equal(parseVersion('{"name":"x"}')._unsafeUnwrapErr().type, 'VersionUnreadable');
  });
});
