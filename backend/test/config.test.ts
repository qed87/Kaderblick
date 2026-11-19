import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { describeConfigError, loadConfig, parseEnv, parseTrainers } from '../src/config.ts';

const requiredEnv = {
  KADERBLICK_TRAINERS_FILE: '/config/trainers.json',
  KADERBLICK_SESSION_KEY: 'ab'.repeat(32),
  KADERBLICK_KURRENTDB_URL: 'kurrentdb://kaderblick-kurrentdb:2113?tls=false',
  KADERBLICK_KURRENTDB_HTTP_URL: 'http://kaderblick-kurrentdb:2113',
};

const KEY_A = 'a'.repeat(32);
const KEY_B = 'b'.repeat(32);

function trainersJson(trainers: Record<string, { key: string; name: string }>): string {
  return JSON.stringify({
    Trainer: Object.fromEntries(
      Object.entries(trainers).map(([id, t]) => [id, { Zugangsschlüssel: t.key, Name: t.name }]),
    ),
  });
}

describe('parseEnv', () => {
  it('setzt die Standardwerte aus 8.1', () => {
    const env = parseEnv(requiredEnv)._unsafeUnwrap();
    assert.equal(env.dataDir, '/data');
    assert.equal(env.port, 8080);
    assert.equal(env.trustProxy, false);
    assert.equal(env.logLevel, 'info');
    assert.equal(env.nodeEnv, 'production');
  });

  it('übernimmt gesetzte Werte', () => {
    const env = parseEnv({ ...requiredEnv, PORT: '3000', TRUST_PROXY: 'true', DATA_DIR: '/tmp/k' })._unsafeUnwrap();
    assert.equal(env.port, 3000);
    assert.equal(env.trustProxy, true);
    assert.equal(env.dataDir, '/tmp/k');
  });

  for (const name of Object.keys(requiredEnv)) {
    it(`lehnt fehlendes ${name} ab und nennt die Variable`, () => {
      const error = parseEnv({ ...requiredEnv, [name]: undefined })._unsafeUnwrapErr();
      assert.equal(error.type, 'InvalidEnvironment');
      assert.match(describeConfigError(error), new RegExp(name));
    });
  }

  it('lehnt ungültige Werte ab', () => {
    for (const invalid of [{ PORT: 'abc' }, { PORT: '70000' }, { TRUST_PROXY: 'yes' }, { LOG_LEVEL: 'verbose' }]) {
      assert.equal(parseEnv({ ...requiredEnv, ...invalid }).isErr(), true, JSON.stringify(invalid));
    }
  });

  it('verlangt einen Session-Schlüssel aus 64 Hex-Zeichen, ohne ihn in der Meldung zu nennen', () => {
    const secret = 'zu-kurz-und-geheim';
    const error = parseEnv({ ...requiredEnv, KADERBLICK_SESSION_KEY: secret })._unsafeUnwrapErr();
    const message = describeConfigError(error);
    assert.match(message, /KADERBLICK_SESSION_KEY/);
    assert.doesNotMatch(message, new RegExp(secret));
  });
});

describe('parseTrainers', () => {
  it('liest Trainer-ID, Name und Zugangsschlüssel', () => {
    const trainers = parseTrainers(
      trainersJson({ 'max.muster@example.org': { key: KEY_A, name: 'Max Muster' } }),
      'trainers.json',
    )._unsafeUnwrap();
    assert.deepEqual(trainers, [{ trainerId: 'max.muster@example.org', name: 'Max Muster', accessKey: KEY_A }]);
  });

  it('lehnt doppelte Zugangsschlüssel ab und nennt nur die betroffenen Trainer', () => {
    const error = parseTrainers(
      trainersJson({
        'a@example.org': { key: KEY_A, name: 'A' },
        'b@example.org': { key: KEY_A, name: 'B' },
        'c@example.org': { key: KEY_B, name: 'C' },
      }),
      'trainers.json',
    )._unsafeUnwrapErr();
    const message = describeConfigError(error);
    assert.equal(error.type, 'InvalidTrainersFile');
    assert.match(message, /a@example\.org, b@example\.org/);
    assert.doesNotMatch(message, /c@example\.org/);
    assert.doesNotMatch(message, new RegExp(KEY_A));
  });

  it('lehnt Zugangsschlüssel unter 32 Zeichen ab, ohne ihn zu nennen', () => {
    const shortKey = 'x'.repeat(31);
    const error = parseTrainers(
      trainersJson({ 'a@example.org': { key: shortKey, name: 'A' } }),
      'trainers.json',
    )._unsafeUnwrapErr();
    const message = describeConfigError(error);
    assert.match(message, /mindestens 32 Zeichen/);
    assert.doesNotMatch(message, new RegExp(shortKey));
  });

  it('lehnt Trainer-IDs ab, die keine E-Mail-Adresse sind', () => {
    assert.equal(parseTrainers(trainersJson({ max: { key: KEY_A, name: 'Max' } }), 'trainers.json').isErr(), true);
  });

  it('lehnt ungültiges JSON ab', () => {
    const error = parseTrainers('{ kein json', 'trainers.json')._unsafeUnwrapErr();
    assert.equal(error.type, 'InvalidTrainersFile');
  });
});

describe('loadConfig', () => {
  let dir: string;

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), 'kaderblick-config-'));
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('liest Umgebung und Trainer-Konfiguration zusammen', async () => {
    const file = join(dir, 'trainers.json');
    await writeFile(file, trainersJson({ 'max.muster@example.org': { key: KEY_A, name: 'Max Muster' } }));
    const config = (await loadConfig({ ...requiredEnv, KADERBLICK_TRAINERS_FILE: file }))._unsafeUnwrap();
    assert.equal(config.port, 8080);
    assert.equal(config.trainers.length, 1);
  });

  it('meldet eine fehlende Trainer-Konfiguration mit Pfad', async () => {
    const file = join(dir, 'fehlt.json');
    const error = (await loadConfig({ ...requiredEnv, KADERBLICK_TRAINERS_FILE: file }))._unsafeUnwrapErr();
    assert.equal(error.type, 'TrainersFileUnreadable');
    assert.match(describeConfigError(error), /fehlt\.json/);
  });

  it('meldet eine ungültige Trainer-Konfiguration mit Pfad', async () => {
    const file = join(dir, 'kaputt.json');
    await writeFile(file, '{ kein json');
    const error = (await loadConfig({ ...requiredEnv, KADERBLICK_TRAINERS_FILE: file }))._unsafeUnwrapErr();
    assert.equal(error.type, 'InvalidTrainersFile');
    assert.match(describeConfigError(error), /kaputt\.json/);
  });

  it('liest die Trainer-Konfiguration nicht bei ungültiger Umgebung', async () => {
    const error = (await loadConfig({ ...requiredEnv, PORT: 'abc' }))._unsafeUnwrapErr();
    assert.equal(error.type, 'InvalidEnvironment');
  });
});
