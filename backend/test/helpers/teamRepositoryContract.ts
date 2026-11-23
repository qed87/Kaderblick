import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Team } from '../../src/domain/team.ts';
import type { TeamRepository } from '../../src/repositories/teamRepository.ts';
import type { TeamId } from '../../src/schemas/ids.ts';

/** Was die Tests von einer Implementierung brauchen, die nicht über `TeamRepository` geht. */
export type RepositoryUnderTest = {
  repository: TeamRepository;
  /** Löscht den Stream endgültig (Tombstone). */
  tombstone(teamId: TeamId): Promise<void>;
  /** Schreibt ein Event ohne Prüfung. */
  appendRaw(teamId: TeamId, type: string, data: unknown): Promise<void>;
  close?(): Promise<void>;
};

let nextTeamId = Date.now() % 1_000_000_000;

/** Jeder Test bekommt eine eigene Nummer, damit Läufe gegen dieselbe KurrentDB sich nicht stören. */
function freshTeamId(): TeamId {
  nextTeamId += 1;
  return nextTeamId;
}

function newTeam(teamId: TeamId, name = 'U19'): Team {
  return Team.create({ teamId, name, season: '2026_27', tier: null })._unsafeUnwrap();
}

/**
 * Gemeinsame Tests für jede `TeamRepository`-Implementierung (Liskov): Alle Varianten müssen sich
 * gleich verhalten, einschließlich der Fehlertypen.
 */
export function describeTeamRepository(name: string, setup: () => Promise<RepositoryUnderTest>): void {
  describe(name, () => {
    let subject: RepositoryUnderTest;

    before(async () => {
      subject = await setup();
    });

    after(async () => {
      await subject.close?.();
    });

    it('speichert ein neues Team und lädt es mit Revision 0', async () => {
      const teamId = freshTeamId();
      const revision = (await subject.repository.save(teamId, newTeam(teamId), null))._unsafeUnwrap();
      assert.equal(revision, 0n);

      const loaded = (await subject.repository.load(teamId))._unsafeUnwrap();
      assert.equal(loaded.revision, 0n);
      assert.deepEqual(loaded.team.pendingEvents, []);
      // Der Name ist geladen: Umbenennen auf denselben Namen ist keine Änderung.
      assert.ok(loaded.team.rename('U19').isOk());
      assert.deepEqual(loaded.team.pendingEvents, []);
    });

    it('hängt neue Events an und liefert die neue Revision', async () => {
      const teamId = freshTeamId();
      await subject.repository.save(teamId, newTeam(teamId), null);
      const { team, revision } = (await subject.repository.load(teamId))._unsafeUnwrap();
      assert.ok(team.rename('U19 II').isOk());
      assert.ok(team.changeTier('Kreisliga').isOk());

      assert.equal((await subject.repository.save(teamId, team, revision))._unsafeUnwrap(), 2n);
      const reloaded = (await subject.repository.load(teamId))._unsafeUnwrap();
      assert.equal(reloaded.revision, 2n);
      assert.ok(reloaded.team.rename('U19 II').isOk());
      assert.deepEqual(reloaded.team.pendingEvents, []);
    });

    it('schreibt ohne Pending Events nichts', async () => {
      const teamId = freshTeamId();
      await subject.repository.save(teamId, newTeam(teamId), null);
      const { team, revision } = (await subject.repository.load(teamId))._unsafeUnwrap();

      assert.equal((await subject.repository.save(teamId, team, revision))._unsafeUnwrap(), 0n);
      assert.equal((await subject.repository.load(teamId))._unsafeUnwrap().revision, 0n);
    });

    it('liefert TeamNotFound für einen unbekannten Stream', async () => {
      const teamId = freshTeamId();
      assert.deepEqual((await subject.repository.load(teamId))._unsafeUnwrapErr(), { type: 'TeamNotFound', teamId });
    });

    it('liefert ConcurrencyConflict bei veralteter Revision', async () => {
      const teamId = freshTeamId();
      await subject.repository.save(teamId, newTeam(teamId), null);
      const first = (await subject.repository.load(teamId))._unsafeUnwrap();
      const second = (await subject.repository.load(teamId))._unsafeUnwrap();
      assert.ok(first.team.rename('A').isOk());
      assert.ok(second.team.rename('B').isOk());
      (await subject.repository.save(teamId, first.team, first.revision))._unsafeUnwrap();

      assert.deepEqual((await subject.repository.save(teamId, second.team, second.revision))._unsafeUnwrapErr(), {
        type: 'ConcurrencyConflict',
        teamId,
      });
    });

    it('liefert ConcurrencyConflict, wenn ein neues Team schon existiert', async () => {
      const teamId = freshTeamId();
      await subject.repository.save(teamId, newTeam(teamId), null);

      assert.deepEqual((await subject.repository.save(teamId, newTeam(teamId, 'U17'), null))._unsafeUnwrapErr(), {
        type: 'ConcurrencyConflict',
        teamId,
      });
    });

    it('liefert ConcurrencyConflict, wenn der Stream zur erwarteten Revision fehlt', async () => {
      const teamId = freshTeamId();
      const team = newTeam(teamId);

      assert.deepEqual((await subject.repository.save(teamId, team, 0n))._unsafeUnwrapErr(), {
        type: 'ConcurrencyConflict',
        teamId,
      });
    });

    it('liefert StreamDeleted beim Anlegen unter einer gesperrten Nummer', async () => {
      const teamId = freshTeamId();
      await subject.repository.save(teamId, newTeam(teamId), null);
      await subject.tombstone(teamId);

      assert.deepEqual((await subject.repository.save(teamId, newTeam(teamId), null))._unsafeUnwrapErr(), {
        type: 'StreamDeleted',
        teamId,
      });
    });

    it('liefert TeamNotFound beim Laden eines endgültig gelöschten Streams', async () => {
      const teamId = freshTeamId();
      await subject.repository.save(teamId, newTeam(teamId), null);
      await subject.tombstone(teamId);

      assert.deepEqual((await subject.repository.load(teamId))._unsafeUnwrapErr(), { type: 'TeamNotFound', teamId });
    });

    it('liefert InvalidEvent für ein Event, das nicht zu seinem Schema passt', async () => {
      const teamId = freshTeamId();
      await subject.repository.save(teamId, newTeam(teamId), null);
      await subject.appendRaw(teamId, 'TeamRenamed', { name: 42 });

      const error = (await subject.repository.load(teamId))._unsafeUnwrapErr();
      assert.ok(error.type === 'InvalidEvent');
      assert.equal(error.revision, 1n);
    });

    it('liefert InvalidEvent für einen unbekannten Event-Typ', async () => {
      const teamId = freshTeamId();
      await subject.repository.save(teamId, newTeam(teamId), null);
      await subject.appendRaw(teamId, 'TeamPainted', { color: 'red' });

      assert.equal((await subject.repository.load(teamId))._unsafeUnwrapErr().type, 'InvalidEvent');
    });

    it('liefert InvalidEvent, wenn der Stream nicht mit TeamCreated beginnt', async () => {
      const teamId = freshTeamId();
      await subject.appendRaw(teamId, 'TeamRenamed', { name: 'U19' });

      const error = (await subject.repository.load(teamId))._unsafeUnwrapErr();
      assert.ok(error.type === 'InvalidEvent');
      assert.equal(error.revision, 0n);
    });
  });
}
