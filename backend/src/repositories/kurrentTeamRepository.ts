import {
  jsonEvent,
  type KurrentDBClient,
  NO_STREAM,
  StreamDeletedError,
  StreamNotFoundError,
  StreamTombstonedError,
  WrongExpectedVersionError,
} from '@kurrent/kurrentdb-client';
import { okAsync, ResultAsync } from 'neverthrow';
import type { Team } from '../domain/team.ts';
import type { TeamId } from '../schemas/ids.ts';
import {
  type LoadedTeam,
  type Revision,
  type StoredEvent,
  teamFromStoredEvents,
  type TeamRepository,
  type TeamRepositoryError,
  teamStreamName,
} from './teamRepository.ts';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function readStoredEvents(client: KurrentDBClient, streamName: string): Promise<StoredEvent[]> {
  const stored: StoredEvent[] = [];
  for await (const resolved of client.readStream(streamName)) {
    if (resolved.event) {
      stored.push({ type: resolved.event.type, data: resolved.event.data, revision: resolved.event.revision });
    }
  }
  return stored;
}

/** Ein nicht vorhandener oder endgültig gelöschter Stream ist beim Lesen ein unbekanntes Team. */
function readError(teamId: TeamId, error: unknown): TeamRepositoryError {
  if (error instanceof StreamNotFoundError || error instanceof StreamDeletedError) {
    return { type: 'TeamNotFound', teamId };
  }
  return { type: 'EventStoreError', message: messageOf(error) };
}

function appendError(teamId: TeamId, error: unknown): TeamRepositoryError {
  if (error instanceof WrongExpectedVersionError) return { type: 'ConcurrencyConflict', teamId };
  if (error instanceof StreamDeletedError || error instanceof StreamTombstonedError) {
    return { type: 'StreamDeleted', teamId };
  }
  return { type: 'EventStoreError', message: messageOf(error) };
}

/** `TeamRepository` auf KurrentDB: ein Stream `team-{teamId}` je Team (5.1.2). */
export class KurrentTeamRepository implements TeamRepository {
  readonly #client: KurrentDBClient;

  constructor(client: KurrentDBClient) {
    this.#client = client;
  }

  load(teamId: TeamId): ResultAsync<LoadedTeam, TeamRepositoryError> {
    return ResultAsync.fromPromise(readStoredEvents(this.#client, teamStreamName(teamId)), (error) =>
      readError(teamId, error),
    ).andThen((stored) => teamFromStoredEvents(teamId, stored));
  }

  save(teamId: TeamId, team: Team, expectedRevision: Revision | null): ResultAsync<Revision, TeamRepositoryError> {
    const events = team.pendingEvents;
    if (events.length === 0 && expectedRevision !== null) return okAsync(expectedRevision);
    return ResultAsync.fromPromise(
      this.#client.appendToStream(
        teamStreamName(teamId),
        events.map((event) => jsonEvent({ type: event.type, data: event.data })),
        // Optimistisches Sperren: nie ANY für den Stream eines Aggregates.
        { streamState: expectedRevision ?? NO_STREAM },
      ),
      (error) => appendError(teamId, error),
    ).map((result) => result.nextExpectedRevision);
  }
}
