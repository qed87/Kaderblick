import { errAsync, okAsync, type ResultAsync } from 'neverthrow';
import type { Team } from '../../src/domain/team.ts';
import {
  type LoadedTeam,
  type Revision,
  type StoredEvent,
  teamFromStoredEvents,
  type TeamRepository,
  type TeamRepositoryError,
  teamStreamName,
} from '../../src/repositories/teamRepository.ts';
import type { TeamId } from '../../src/schemas/ids.ts';

const TOMBSTONED = Symbol('tombstoned');

/**
 * `TeamRepository` im Speicher für Service- und Routentests. Verhält sich wie die KurrentDB-
 * Variante: Events werden als JSON abgelegt und beim Lesen mit ihren Schemas geprüft, die Revision
 * zählt ab 0, gelöschte Streams sind gesperrt. Dieselben Tests laufen gegen beide Varianten.
 */
export class InMemoryTeamRepository implements TeamRepository {
  readonly #streams = new Map<string, StoredEvent[] | typeof TOMBSTONED>();

  load(teamId: TeamId): ResultAsync<LoadedTeam, TeamRepositoryError> {
    const stream = this.#streams.get(teamStreamName(teamId));
    if (!stream || stream === TOMBSTONED) return errAsync({ type: 'TeamNotFound', teamId });
    return teamFromStoredEvents(teamId, stream).match(
      (loaded) => okAsync(loaded),
      (error) => errAsync(error),
    );
  }

  save(teamId: TeamId, team: Team, expectedRevision: Revision | null): ResultAsync<Revision, TeamRepositoryError> {
    const events = team.pendingEvents;
    if (events.length === 0 && expectedRevision !== null) return okAsync(expectedRevision);
    const name = teamStreamName(teamId);
    const stream = this.#streams.get(name);
    if (stream === TOMBSTONED) return errAsync({ type: 'StreamDeleted', teamId });
    const current = stream?.at(-1)?.revision ?? null;
    if (current !== expectedRevision) return errAsync({ type: 'ConcurrencyConflict', teamId });
    const stored = [...(stream ?? [])];
    for (const event of events) this.#append(stored, event.type, event.data);
    this.#streams.set(name, stored);
    return okAsync(BigInt(stored.length - 1));
  }

  /** Nur für Tests: löscht den Stream endgültig wie ein Tombstone in KurrentDB. */
  tombstone(teamId: TeamId): void {
    this.#streams.set(teamStreamName(teamId), TOMBSTONED);
  }

  /** Nur für Tests: schreibt ein Event ohne Prüfung, z. B. eines mit ungültigen Daten. */
  appendRaw(teamId: TeamId, type: string, data: unknown): void {
    const name = teamStreamName(teamId);
    const stream = this.#streams.get(name);
    const stored = stream === TOMBSTONED || !stream ? [] : stream;
    this.#append(stored, type, data);
    this.#streams.set(name, stored);
  }

  #append(stored: StoredEvent[], type: string, data: unknown): void {
    // Wie beim Speichern in KurrentDB: Die Daten gehen als JSON hin und zurück.
    stored.push({ type, data: JSON.parse(JSON.stringify(data)) as unknown, revision: BigInt(stored.length) });
  }
}
