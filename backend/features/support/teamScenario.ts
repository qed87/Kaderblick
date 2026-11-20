import { randomUUID } from 'node:crypto';
import type { Result } from 'neverthrow';
import type { DomainError } from '../../src/domain/errors.ts';
import type { TeamEvent } from '../../src/domain/events.ts';
import { Team } from '../../src/domain/team.ts';
import type { PlayerId } from '../../src/schemas/ids.ts';

/**
 * Ablauf eines Domänen-Szenarios: Die Givens sammeln Events als Vorgeschichte, das When baut
 * daraus das Team über `Team.fromEvents` und ruft eine Geschäftsmethode auf, das Then prüft
 * Ergebnis und neue Events.
 */
export class TeamScenario {
  #history: TeamEvent[] = [];
  #playerIds = new Map<string, PlayerId>();
  #team: Team | undefined;
  #result: Result<unknown, DomainError> | undefined;

  /** Liefert die feste playerId zu einem Namen wie "Mia" im Szenario. */
  playerId(alias: string): PlayerId {
    let id = this.#playerIds.get(alias);
    if (!id) {
      id = randomUUID();
      this.#playerIds.set(alias, id);
    }
    return id;
  }

  given(event: TeamEvent): void {
    this.#history.push(event);
  }

  create(result: Result<Team, DomainError>): void {
    this.#result = result;
    this.#team = result.unwrapOr(undefined);
  }

  act(method: (team: Team) => Result<unknown, DomainError>): void {
    this.#team = Team.fromEvents(this.#history);
    this.#result = method(this.#team);
  }

  get result(): Result<unknown, DomainError> {
    if (!this.#result) throw new Error('Im Szenario wurde noch keine Geschäftsmethode aufgerufen.');
    return this.#result;
  }

  get recorded(): readonly TeamEvent[] {
    return this.#team?.pendingEvents ?? [];
  }
}
