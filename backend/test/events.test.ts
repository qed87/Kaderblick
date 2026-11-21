import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { teamEventSchema } from '../src/domain/events.ts';

const playerId = '7d4a2c1e-9b3f-4e8a-a6d2-5c1f0e9b8a7d';

/** Je Event-Typ aus 5.3.1 und 5.3.2 ein gültiges Beispiel. */
const examples = [
  { type: 'TeamCreated', data: { teamId: 7, name: 'U19', season: '2026_27', tier: 'Kreisliga' } },
  { type: 'TeamCreated', data: { teamId: 7, name: 'U19', season: '2026_27', tier: null } },
  { type: 'TeamRenamed', data: { name: 'U19 II' } },
  { type: 'SeasonChanged', data: { season: '2027_28' } },
  { type: 'TierChanged', data: { tier: 'Bezirksliga' } },
  { type: 'TierChanged', data: { tier: null } },
  { type: 'CrestUploaded', data: {} },
  { type: 'CrestRemoved', data: {} },
  { type: 'CoachesChanged', data: {} },
  { type: 'CoachesRemoved', data: {} },
  { type: 'TeamDeleted', data: {} },
  { type: 'PlayerAddedToSquad', data: { playerId, shirtNumber: 10, position: 'MF' } },
  { type: 'PlayerAddedToSquad', data: { playerId, shirtNumber: null, position: null } },
  { type: 'ShirtNumberAssigned', data: { playerId, number: 7 } },
  { type: 'ShirtNumberRemoved', data: { playerId } },
  { type: 'PositionChanged', data: { playerId, position: 'AR' } },
  { type: 'PositionRemoved', data: { playerId } },
  { type: 'PlayerDeactivated', data: { playerId } },
  { type: 'PlayerReactivated', data: { playerId } },
  { type: 'PlayerRemovedFromSquad', data: { playerId } },
  { type: 'PlayerProfileChanged', data: { playerId } },
];

describe('teamEventSchema', () => {
  for (const example of examples) {
    it(`liest ${example.type} ${JSON.stringify(example.data)}`, () => {
      assert.deepEqual(teamEventSchema.parse(example), example);
    });
  }

  it('deckt alle Event-Typen aus 5.3.1 und 5.3.2 ab', () => {
    assert.equal(new Set(examples.map((e) => e.type)).size, 18);
  });

  it('lehnt unbekannte Event-Typen ab', () => {
    assert.equal(teamEventSchema.safeParse({ type: 'TeamUpdated', data: {} }).success, false);
  });

  it('lehnt fehlende oder falsch getypte Felder ab', () => {
    for (const invalid of [
      { type: 'TeamCreated', data: { teamId: 7, name: 'U19', season: '2026_27' } },
      { type: 'TeamCreated', data: { teamId: '7', name: 'U19', season: '2026_27', tier: null } },
      { type: 'PositionChanged', data: { playerId, position: 'LV' } },
      { type: 'PlayerDeactivated', data: { playerId: 'keine-uuid' } },
      { type: 'ShirtNumberAssigned', data: { playerId, number: 7.5 } },
    ]) {
      assert.equal(teamEventSchema.safeParse(invalid).success, false, JSON.stringify(invalid));
    }
  });

  it('liest Events auch dann, wenn ihre Werte heutige Regeln verletzen', () => {
    // Ein Event ist eine Tatsache; Regeln wie das Saisonformat prüft die Geschäftsmethode.
    const event = { type: 'SeasonChanged', data: { season: '2026_28' } };
    assert.deepEqual(teamEventSchema.parse(event), event);
  });

  it('übernimmt unbekannte Felder im Payload nicht', () => {
    const parsed = teamEventSchema.parse({ type: 'TeamRenamed', data: { name: 'U19', extra: 1 } });
    assert.deepEqual(parsed, { type: 'TeamRenamed', data: { name: 'U19' } });
  });
});
