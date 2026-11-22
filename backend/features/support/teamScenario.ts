import { randomUUID } from 'node:crypto';
import type { Result } from 'neverthrow';
import type { DomainError } from '../../src/domain/errors.ts';
import type { TeamEvent } from '../../src/domain/events.ts';
import { Team } from '../../src/domain/team.ts';
import type { AppointmentId, PlayerId } from '../../src/schemas/ids.ts';

function idFor(ids: Map<string, string>, alias: string): string {
  let id = ids.get(alias);
  if (!id) {
    id = randomUUID();
    ids.set(alias, id);
  }
  return id;
}

/**
 * Ablauf eines Domänen-Szenarios: Die Givens sammeln Events als Vorgeschichte, das When baut
 * daraus das Team über `Team.fromEvents` und ruft eine Geschäftsmethode auf, das Then prüft
 * Ergebnis und neue Events.
 */
export class TeamScenario {
  #history: TeamEvent[] = [];
  #playerIds = new Map<string, PlayerId>();
  #appointmentIds = new Map<string, AppointmentId>();
  #matchIds = new Set<AppointmentId>();
  #team: Team | undefined;
  #result: Result<unknown, DomainError> | undefined;

  /** Liefert die feste playerId zu einem Namen wie "Mia" im Szenario. */
  playerId(alias: string): PlayerId {
    return idFor(this.#playerIds, alias);
  }

  /** Liefert die feste ID eines Termins zu einem Kürzel wie "M1" im Szenario. */
  appointmentId(alias: string): AppointmentId {
    return idFor(this.#appointmentIds, alias);
  }

  given(event: TeamEvent): void {
    this.#history.push(event);
    if (event.type === 'MatchScheduled') this.#matchIds.add(event.data.appointmentId);
  }

  /** Ob die Vorgeschichte die ID als Spieltag angelegt hat. */
  isMatch(appointmentId: AppointmentId): boolean {
    return this.#matchIds.has(appointmentId);
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
