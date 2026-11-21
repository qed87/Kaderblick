import { err, ok, Result } from 'neverthrow';
import type { Competition, Focus, Venue } from '../schemas/fieldValues.ts';
import type { AppointmentId } from '../schemas/ids.ts';
import type { DomainError } from './errors.ts';
import type { AppointmentEvent, MatchEvent, MatchScheduled, TrainingEvent, TrainingScheduled } from './events.ts';

/**
 * Ergebnis einer Prüfung: das Event, das die Änderung beschreibt, `undefined` bei einer leeren
 * Änderung (Regel 12) oder ein fachlicher Fehler.
 */
export type Decision<Event> = Result<Event | undefined, DomainError>;

const MAX_TRAINING_MINUTES = 600;

export type ScheduleMatch = {
  matchId: AppointmentId;
  date: string;
  matchday?: number | null;
  opponent?: string | null;
  venue?: Venue | null;
  competition?: Competition | null;
};

export type ScheduleTraining = {
  trainingId: AppointmentId;
  date: string;
  duration: number;
  topic?: string | null;
  focus?: Focus;
};

/** Regel 8: ganze Zahl im erlaubten Bereich, sonst `InvalidValue` für das Feld. */
function wholeNumber(field: string, value: number, min: number, max = Infinity): Result<number, DomainError> {
  return Number.isInteger(value) && value >= min && value <= max ? ok(value) : err({ type: 'InvalidValue', field });
}

/** Gegner: ohne Leerzeichen am Rand und nicht leer. */
function validOpponent(opponent: string): Result<string, DomainError> {
  const trimmed = opponent.trim();
  return trimmed.length > 0 ? ok(trimmed) : err({ type: 'InvalidValue', field: 'opponent' });
}

function validTrainingDuration(minutes: number): Result<number, DomainError> {
  return wholeNumber('duration', minutes, 1, MAX_TRAINING_MINUTES);
}

/** Thema: ohne Leerzeichen am Rand; ein leeres Thema heißt „kein Thema“. */
function normalizeTopic(topic: string | null): string | null {
  const trimmed = topic?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

/** Schwerpunkte: jeder höchstens einmal, in der angegebenen Reihenfolge. */
function normalizeFocus(focus: Focus): Focus {
  return [...new Set(focus)];
}

function sameFocus(a: Focus, b: Focus): boolean {
  return a.length === b.length && a.every((area) => b.includes(area));
}

/**
 * Ein Termin des Teams (Spezifikation 3, „Termin als Basisklasse“). Enthält, was Spieltage und
 * Trainings gemeinsam haben. Termine sind Teil des Team-Aggregates: Sie prüfen ihre Regeln und
 * beschreiben eine Änderung als Event, erzeugen und speichern es aber nicht selbst. Das übernimmt
 * `Team`, das Events über `apply` an den Termin zurückgibt.
 */
export abstract class Appointment {
  readonly id: AppointmentId;
  #date: string;
  #hasNotes = false;

  protected constructor(id: AppointmentId, date: string) {
    this.id = id;
    this.#date = date;
  }

  reschedule(date: string): Decision<AppointmentEvent> {
    return ok(date === this.#date ? undefined : { type: 'AppointmentRescheduled', data: { appointmentId: this.id, date } });
  }

  /** Die Notiz liegt als Datei vor; jedes Schreiben ist eine Änderung. */
  writeNotes(): Decision<AppointmentEvent> {
    return ok({ type: 'AppointmentNotesWritten', data: { appointmentId: this.id } });
  }

  removeNotes(): Decision<AppointmentEvent> {
    return ok(this.#hasNotes ? { type: 'AppointmentNotesRemoved', data: { appointmentId: this.id } } : undefined);
  }

  /** Übernimmt ein Event in den Zustand. Unterklassen behandeln ihre eigenen Events zuerst. */
  apply(event: AppointmentEvent | MatchEvent | TrainingEvent): void {
    switch (event.type) {
      case 'AppointmentRescheduled':
        this.#date = event.data.date;
        break;
      case 'AppointmentNotesWritten':
        this.#hasNotes = true;
        break;
      case 'AppointmentNotesRemoved':
        this.#hasNotes = false;
        break;
      default:
        // Events der anderen Termin-Art betreffen diesen Termin nicht.
        break;
    }
  }
}

export class Match extends Appointment {
  #matchday: number | null;
  #opponent: string | null;
  #venue: Venue | null;
  #competition: Competition | null;
  #result: { goalsFor: number; goalsAgainst: number } | null = null;

  constructor(scheduled: MatchScheduled) {
    super(scheduled.appointmentId, scheduled.date);
    this.#matchday = scheduled.matchday;
    this.#opponent = scheduled.opponent;
    this.#venue = scheduled.venue;
    this.#competition = scheduled.competition;
  }

  /** Prüft die Angaben eines neuen Spieltags (Regel 8) und liefert die Daten für `MatchScheduled`. */
  static schedule(input: ScheduleMatch): Result<MatchScheduled, DomainError> {
    const matchday = input.matchday == null ? ok(null) : wholeNumber('matchday', input.matchday, 1);
    const opponent = input.opponent == null ? ok(null) : validOpponent(input.opponent);
    return Result.combine([matchday, opponent]).map(([validMatchday, validOpponent]) => ({
      appointmentId: input.matchId,
      date: input.date,
      matchday: validMatchday,
      opponent: validOpponent,
      venue: input.venue ?? null,
      competition: input.competition ?? null,
    }));
  }

  changeMatchday(matchday: number): Decision<MatchEvent> {
    return wholeNumber('matchday', matchday, 1).map((valid) =>
      valid === this.#matchday ? undefined : { type: 'MatchdayChanged', data: { appointmentId: this.id, matchday: valid } },
    );
  }

  removeMatchday(): Decision<MatchEvent> {
    return ok(this.#matchday === null ? undefined : { type: 'MatchdayRemoved', data: { appointmentId: this.id } });
  }

  changeOpponent(opponent: string): Decision<MatchEvent> {
    return validOpponent(opponent).map((valid) =>
      valid === this.#opponent ? undefined : { type: 'OpponentChanged', data: { appointmentId: this.id, opponent: valid } },
    );
  }

  removeOpponent(): Decision<MatchEvent> {
    return ok(this.#opponent === null ? undefined : { type: 'OpponentRemoved', data: { appointmentId: this.id } });
  }

  changeVenue(venue: Venue): Decision<MatchEvent> {
    return ok(venue === this.#venue ? undefined : { type: 'VenueChanged', data: { appointmentId: this.id, venue } });
  }

  removeVenue(): Decision<MatchEvent> {
    return ok(this.#venue === null ? undefined : { type: 'VenueRemoved', data: { appointmentId: this.id } });
  }

  changeCompetition(competition: Competition): Decision<MatchEvent> {
    return ok(
      competition === this.#competition
        ? undefined
        : { type: 'CompetitionChanged', data: { appointmentId: this.id, competition } },
    );
  }

  removeCompetition(): Decision<MatchEvent> {
    return ok(this.#competition === null ? undefined : { type: 'CompetitionRemoved', data: { appointmentId: this.id } });
  }

  recordResult(goalsFor: number, goalsAgainst: number): Decision<MatchEvent> {
    return wholeNumber('goalsFor', goalsFor, 0)
      .andThen(() => wholeNumber('goalsAgainst', goalsAgainst, 0))
      .map(() =>
        this.#result?.goalsFor === goalsFor && this.#result.goalsAgainst === goalsAgainst
          ? undefined
          : { type: 'MatchResultRecorded', data: { appointmentId: this.id, goalsFor, goalsAgainst } },
      );
  }

  clearResult(): Decision<MatchEvent> {
    return ok(this.#result === null ? undefined : { type: 'MatchResultCleared', data: { appointmentId: this.id } });
  }

  override apply(event: AppointmentEvent | MatchEvent | TrainingEvent): void {
    switch (event.type) {
      case 'MatchdayChanged':
        this.#matchday = event.data.matchday;
        break;
      case 'MatchdayRemoved':
        this.#matchday = null;
        break;
      case 'OpponentChanged':
        this.#opponent = event.data.opponent;
        break;
      case 'OpponentRemoved':
        this.#opponent = null;
        break;
      case 'VenueChanged':
        this.#venue = event.data.venue;
        break;
      case 'VenueRemoved':
        this.#venue = null;
        break;
      case 'CompetitionChanged':
        this.#competition = event.data.competition;
        break;
      case 'CompetitionRemoved':
        this.#competition = null;
        break;
      case 'MatchResultRecorded':
        this.#result = { goalsFor: event.data.goalsFor, goalsAgainst: event.data.goalsAgainst };
        break;
      case 'MatchResultCleared':
        this.#result = null;
        break;
      default:
        super.apply(event);
    }
  }
}

export class Training extends Appointment {
  #duration: number;
  #topic: string | null;
  #focus: Focus;

  constructor(scheduled: TrainingScheduled) {
    super(scheduled.appointmentId, scheduled.date);
    this.#duration = scheduled.duration;
    this.#topic = scheduled.topic;
    this.#focus = scheduled.focus;
  }

  /** Prüft die Angaben eines neuen Trainings (Regel 8) und liefert die Daten für `TrainingScheduled`. */
  static schedule(input: ScheduleTraining): Result<TrainingScheduled, DomainError> {
    return validTrainingDuration(input.duration).map((duration) => ({
      appointmentId: input.trainingId,
      date: input.date,
      duration,
      topic: normalizeTopic(input.topic ?? null),
      focus: normalizeFocus(input.focus ?? []),
    }));
  }

  changeDuration(minutes: number): Decision<TrainingEvent> {
    return validTrainingDuration(minutes).map((valid) =>
      valid === this.#duration
        ? undefined
        : { type: 'TrainingDurationChanged', data: { appointmentId: this.id, minutes: valid } },
    );
  }

  /** `null` oder ein leeres Thema entfernt das Thema. */
  changeTopic(topic: string | null): Decision<TrainingEvent> {
    const normalized = normalizeTopic(topic);
    return ok(
      normalized === this.#topic
        ? undefined
        : { type: 'TrainingTopicChanged', data: { appointmentId: this.id, topic: normalized } },
    );
  }

  changeFocus(focus: Focus): Decision<TrainingEvent> {
    const normalized = normalizeFocus(focus);
    return ok(
      sameFocus(normalized, this.#focus)
        ? undefined
        : { type: 'TrainingFocusChanged', data: { appointmentId: this.id, focus: normalized } },
    );
  }

  override apply(event: AppointmentEvent | MatchEvent | TrainingEvent): void {
    switch (event.type) {
      case 'TrainingDurationChanged':
        this.#duration = event.data.minutes;
        break;
      case 'TrainingTopicChanged':
        this.#topic = event.data.topic;
        break;
      case 'TrainingFocusChanged':
        this.#focus = event.data.focus;
        break;
      default:
        super.apply(event);
    }
  }
}
