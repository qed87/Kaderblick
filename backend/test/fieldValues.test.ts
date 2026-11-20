import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { focusSchema, positionSchema, seasonSchema } from '../src/schemas/fieldValues.ts';

describe('seasonSchema', () => {
  for (const season of ['2026_27', '1999_00', '2099_00']) {
    it(`akzeptiert ${season}`, () => {
      assert.equal(seasonSchema.safeParse(season).success, true);
    });
  }

  for (const season of ['2026_28', '2026_26', '2026/27', '26_27', '2026_027', ' 2026_27', '']) {
    it(`lehnt "${season}" ab`, () => {
      assert.equal(seasonSchema.safeParse(season).success, false);
    });
  }
});

describe('Feldwerte', () => {
  it('nutzt die Werte aus 6.2.6', () => {
    assert.deepEqual(positionSchema.options, ['TW', 'AB', 'MF', 'ST', 'AR']);
    assert.equal(positionSchema.safeParse('tw').success, false);
  });

  it('erlaubt für focus eine Liste, auch leer', () => {
    assert.equal(focusSchema.safeParse([]).success, true);
    assert.equal(focusSchema.safeParse(['technique', 'setPieces']).success, true);
    assert.equal(focusSchema.safeParse(['juggling']).success, false);
  });
});
