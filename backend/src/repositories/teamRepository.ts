import { err, ok, Result, type ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { type TeamEvent, teamEventSchema } from '../domain/events.ts';
import { Team } from '../domain/team.ts';
import type { TeamId } from '../schemas/ids.ts';

/** Revision des Streams: Nummer des letzten Events, beginnend bei 0 (wie in KurrentDB). */
export type Revision = bigint;

export type LoadedTeam = { team: Team; revision: Revision };

export type TeamRepositoryError =
  | { type: 'TeamNotFound'; teamId: TeamId }
  /** Der Stream hat nicht die erwartete Revision bzw. existiert beim Anlegen schon (5.1.4). */
  | { type: 'ConcurrencyConflict'; teamId: TeamId }
  /** Der Stream wurde endgültig gelöscht; seine Nummer ist gesperrt (5.1.3). */
  | { type: 'StreamDeleted'; teamId: TeamId }
  /** Ein gespeichertes Event passt nicht zu seinem Schema. */
  | { type: 'InvalidEvent'; teamId: TeamId; revision: Revision; message: string }
  | { type: 'EventStoreError'; message: string };

/**
 * Lädt und speichert Teams (Spezifikation 5.1.4). Implementierungen verhalten sich gleich,
 * einschließlich der Fehler; das prüfen dieselben Tests für alle Implementierungen.
 */
export type TeamRepository = {
  /** Liest den Stream des Teams und liefert das Team mit der gelesenen Revision. */
  load(teamId: TeamId): ResultAsync<LoadedTeam, TeamRepositoryError>;
  /**
   * Schreibt die Pending Events des Teams. `expectedRevision` ist die beim Laden gelesene
   * Revision, bei einem neuen Team `null`. Liefert die Revision nach dem Schreiben; ohne Pending
   * Events wird nichts geschrieben.
   */
  save(teamId: TeamId, team: Team, expectedRevision: Revision | null): ResultAsync<Revision, TeamRepositoryError>;
};

export function teamStreamName(teamId: TeamId): string {
  return `team-${teamId}`;
}

/** Ein Event, wie es im Event Store steht: Typ und Daten noch ungeprüft. */
export type StoredEvent = { type: string; data: unknown; revision: Revision };

function parseEvent(teamId: TeamId, stored: StoredEvent): Result<TeamEvent, TeamRepositoryError> {
  const parsed = teamEventSchema.safeParse({ type: stored.type, data: stored.data });
  return parsed.success
    ? ok(parsed.data)
    : err({ type: 'InvalidEvent', teamId, revision: stored.revision, message: z.prettifyError(parsed.error) });
}

/** Prüft jedes gelesene Event mit seinem Zod-Schema und baut daraus das Team. */
export function teamFromStoredEvents(
  teamId: TeamId,
  stored: readonly StoredEvent[],
): Result<LoadedTeam, TeamRepositoryError> {
  const [first] = stored;
  const last = stored.at(-1);
  if (!first || !last) return err({ type: 'TeamNotFound', teamId });
  return Result.combine(stored.map((event) => parseEvent(teamId, event))).andThen((events) =>
    events[0]?.type === 'TeamCreated'
      ? ok({ team: Team.fromEvents(events), revision: last.revision })
      : err({
          type: 'InvalidEvent',
          teamId,
          revision: first.revision,
          message: 'Der Stream eines Teams muss mit TeamCreated beginnen.',
        } as const),
  );
}
