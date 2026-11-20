import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Team } from '../src/domain/team.ts';

describe('Team.fromEvents', () => {
  it('verlangt einen Stream, der mit TeamCreated beginnt', () => {
    assert.throws(() => Team.fromEvents([]), /TeamCreated/);
    assert.throws(() => Team.fromEvents([{ type: 'TeamRenamed', data: { name: 'U19' } }]), /TeamCreated/);
  });

  it('wendet gespeicherte Events an, auch wenn sie heutige Regeln verletzen', () => {
    const team = Team.fromEvents([
      { type: 'TeamCreated', data: { teamId: 7, name: 'U19', season: '2026_28', tier: null } },
    ]);
    assert.deepEqual(team.pendingEvents, []);
  });
});
