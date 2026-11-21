import { err, ok, type Result } from 'neverthrow';
import { type Position, seasonSchema } from '../schemas/fieldValues.ts';
import type { PlayerId, TeamId } from '../schemas/ids.ts';
import type { DomainError } from './errors.ts';
import type { TeamEvent } from './events.ts';

type SquadPlayer = {
  shirtNumber: number | null;
  position: Position | null;
  active: boolean;
};

type TeamState = {
  name: string;
  season: string;
  tier: string | null;
  hasCrest: boolean;
  hasCoaches: boolean;
  deleted: boolean;
  squad: Map<PlayerId, SquadPlayer>;
};

export type CreateTeam = { teamId: TeamId; name: string; season: string; tier: string | null };
export type AddPlayer = { playerId: PlayerId; shirtNumber?: number | null; position?: Position | null };

/** Regel 2: Der Name ist nach Entfernen von Leerzeichen am Rand nicht leer. */
function validName(name: string): Result<string, DomainError> {
  const trimmed = name.trim();
  return trimmed.length > 0 ? ok(trimmed) : err({ type: 'InvalidName' });
}

/** Regel 2: Saison im Format JJJJ_JJ mit dem Folgejahr. */
function validSeason(season: string): Result<string, DomainError> {
  return seasonSchema.safeParse(season).success ? ok(season) : err({ type: 'InvalidSeason' });
}

/**
 * Das Team-Aggregate (Spezifikation 5.1): Teamdaten und Kader. Der Zustand entsteht nur aus
 * Events; Geschäftsmethoden prüfen die Regeln aus 5.2 und erzeugen bei Erfolg Events über
 * `#raise`. Im Fehlerfall entsteht kein Event und der Zustand bleibt unverändert.
 */
export class Team {
  #state: TeamState = {
    name: '',
    season: '',
    tier: null,
    hasCrest: false,
    hasCoaches: false,
    deleted: false,
    squad: new Map(),
  };

  #pendingEvents: TeamEvent[] = [];

  private constructor() {}

  static create(input: CreateTeam): Result<Team, DomainError> {
    return validName(input.name).andThen((name) =>
      validSeason(input.season).map((season) => {
        const team = new Team();
        team.#raise({ type: 'TeamCreated', data: { teamId: input.teamId, name, season, tier: input.tier } });
        return team;
      }),
    );
  }

  /** Baut ein Team aus den Events seines Streams auf. Der Stream beginnt immer mit `TeamCreated`. */
  static fromEvents(events: readonly TeamEvent[]): Team {
    if (events[0]?.type !== 'TeamCreated') {
      throw new Error('Der Stream eines Teams muss mit TeamCreated beginnen.');
    }
    const team = new Team();
    for (const event of events) {
      team.#apply(event);
    }
    return team;
  }

  /** Events, die seit dem Laden bzw. Anlegen entstanden sind und noch gespeichert werden müssen. */
  get pendingEvents(): readonly TeamEvent[] {
    return this.#pendingEvents;
  }

  // 5.3.1 Team

  rename(name: string): Result<void, DomainError> {
    return this.#ensureNotDeleted()
      .andThen(() => validName(name))
      .map((trimmed) => {
        if (trimmed !== this.#state.name) this.#raise({ type: 'TeamRenamed', data: { name: trimmed } });
      });
  }

  changeSeason(season: string): Result<void, DomainError> {
    return this.#ensureNotDeleted()
      .andThen(() => validSeason(season))
      .map((valid) => {
        if (valid !== this.#state.season) this.#raise({ type: 'SeasonChanged', data: { season: valid } });
      });
  }

  /** `null` entfernt die Spielklasse. */
  changeTier(tier: string | null): Result<void, DomainError> {
    return this.#ensureNotDeleted().map(() => {
      if (tier !== this.#state.tier) this.#raise({ type: 'TierChanged', data: { tier } });
    });
  }

  /** Das Bild liegt als Datei vor; jedes Hochladen ist eine Änderung. */
  uploadCrest(): Result<void, DomainError> {
    return this.#ensureNotDeleted().map(() => {
      this.#raise({ type: 'CrestUploaded', data: {} });
    });
  }

  removeCrest(): Result<void, DomainError> {
    return this.#ensureNotDeleted().map(() => {
      if (this.#state.hasCrest) this.#raise({ type: 'CrestRemoved', data: {} });
    });
  }

  /** Der Text liegt als Datei vor; jede Änderung erzeugt ein Event. */
  changeCoaches(): Result<void, DomainError> {
    return this.#ensureNotDeleted().map(() => {
      this.#raise({ type: 'CoachesChanged', data: {} });
    });
  }

  removeCoaches(): Result<void, DomainError> {
    return this.#ensureNotDeleted().map(() => {
      if (this.#state.hasCoaches) this.#raise({ type: 'CoachesRemoved', data: {} });
    });
  }

  /** Erneutes Löschen eines gelöschten Teams ist keine Änderung (Regel 1). */
  delete(): Result<void, DomainError> {
    if (!this.#state.deleted) this.#raise({ type: 'TeamDeleted', data: {} });
    return ok(undefined);
  }

  // 5.3.2 Kader

  addPlayer(input: AddPlayer): Result<void, DomainError> {
    return this.#ensureNotDeleted()
      .andThen(() =>
        this.#state.squad.has(input.playerId)
          ? err({ type: 'PlayerAlreadyInSquad', playerId: input.playerId } as const)
          : ok(undefined),
      )
      .map(() => {
        this.#raise({
          type: 'PlayerAddedToSquad',
          data: {
            playerId: input.playerId,
            shirtNumber: input.shirtNumber ?? null,
            position: input.position ?? null,
          },
        });
      });
  }

  assignShirtNumber(playerId: PlayerId, number: number): Result<void, DomainError> {
    return this.#squadPlayer(playerId).map((player) => {
      if (player.shirtNumber !== number) this.#raise({ type: 'ShirtNumberAssigned', data: { playerId, number } });
    });
  }

  removeShirtNumber(playerId: PlayerId): Result<void, DomainError> {
    return this.#squadPlayer(playerId).map((player) => {
      if (player.shirtNumber !== null) this.#raise({ type: 'ShirtNumberRemoved', data: { playerId } });
    });
  }

  changePosition(playerId: PlayerId, position: Position): Result<void, DomainError> {
    return this.#squadPlayer(playerId).map((player) => {
      if (player.position !== position) this.#raise({ type: 'PositionChanged', data: { playerId, position } });
    });
  }

  removePosition(playerId: PlayerId): Result<void, DomainError> {
    return this.#squadPlayer(playerId).map((player) => {
      if (player.position !== null) this.#raise({ type: 'PositionRemoved', data: { playerId } });
    });
  }

  deactivatePlayer(playerId: PlayerId): Result<void, DomainError> {
    return this.#squadPlayer(playerId).map((player) => {
      if (player.active) this.#raise({ type: 'PlayerDeactivated', data: { playerId } });
    });
  }

  reactivatePlayer(playerId: PlayerId): Result<void, DomainError> {
    return this.#squadPlayer(playerId).map((player) => {
      if (!player.active) this.#raise({ type: 'PlayerReactivated', data: { playerId } });
    });
  }

  removePlayer(playerId: PlayerId): Result<void, DomainError> {
    return this.#squadPlayer(playerId).map(() => {
      this.#raise({ type: 'PlayerRemovedFromSquad', data: { playerId } });
    });
  }

  /** Vermerkt eine Änderung am Spielerprofil, damit andere Trainer sie über die Revision erkennen. */
  noteProfileChanged(playerId: PlayerId): Result<void, DomainError> {
    return this.#squadPlayer(playerId).map(() => {
      this.#raise({ type: 'PlayerProfileChanged', data: { playerId } });
    });
  }

  // Prüfungen

  /** Regel 1: Auf ein gelöschtes Team wird keine Geschäftsmethode mehr angewendet. */
  #ensureNotDeleted(): Result<void, DomainError> {
    return this.#state.deleted ? err({ type: 'TeamDeleted' }) : ok(undefined);
  }

  /** Regel 3: Nur Kaderspieler können bearbeitet werden. */
  #squadPlayer(playerId: PlayerId): Result<SquadPlayer, DomainError> {
    return this.#ensureNotDeleted().andThen(() => {
      const player = this.#state.squad.get(playerId);
      return player ? ok(player) : err({ type: 'PlayerNotInSquad', playerId } as const);
    });
  }

  // Events

  #raise(event: TeamEvent): void {
    this.#apply(event);
    this.#pendingEvents.push(event);
  }

  /** Übernimmt ein Event in den Zustand. Prüft nichts: Ein Event ist eine Tatsache. */
  #apply(event: TeamEvent): void {
    const state = this.#state;
    switch (event.type) {
      case 'TeamCreated':
        state.name = event.data.name;
        state.season = event.data.season;
        state.tier = event.data.tier;
        break;
      case 'TeamRenamed':
        state.name = event.data.name;
        break;
      case 'SeasonChanged':
        state.season = event.data.season;
        break;
      case 'TierChanged':
        state.tier = event.data.tier;
        break;
      case 'CrestUploaded':
        state.hasCrest = true;
        break;
      case 'CrestRemoved':
        state.hasCrest = false;
        break;
      case 'CoachesChanged':
        state.hasCoaches = true;
        break;
      case 'CoachesRemoved':
        state.hasCoaches = false;
        break;
      case 'TeamDeleted':
        state.deleted = true;
        break;
      case 'PlayerAddedToSquad':
        state.squad.set(event.data.playerId, {
          shirtNumber: event.data.shirtNumber,
          position: event.data.position,
          active: true,
        });
        break;
      case 'ShirtNumberAssigned':
        this.#updatePlayer(event.data.playerId, { shirtNumber: event.data.number });
        break;
      case 'ShirtNumberRemoved':
        this.#updatePlayer(event.data.playerId, { shirtNumber: null });
        break;
      case 'PositionChanged':
        this.#updatePlayer(event.data.playerId, { position: event.data.position });
        break;
      case 'PositionRemoved':
        this.#updatePlayer(event.data.playerId, { position: null });
        break;
      case 'PlayerDeactivated':
        this.#updatePlayer(event.data.playerId, { active: false });
        break;
      case 'PlayerReactivated':
        this.#updatePlayer(event.data.playerId, { active: true });
        break;
      case 'PlayerRemovedFromSquad':
        state.squad.delete(event.data.playerId);
        break;
      case 'PlayerProfileChanged':
        // Nur ein Hinweis auf die geänderte Profildatei; der Zustand ändert sich nicht.
        break;
      default:
        event satisfies never;
    }
  }

  #updatePlayer(playerId: PlayerId, change: Partial<SquadPlayer>): void {
    const player = this.#state.squad.get(playerId);
    // Ein Event zu einem Spieler, der nicht (mehr) im Kader ist, ändert nichts.
    if (player) this.#state.squad.set(playerId, { ...player, ...change });
  }
}
