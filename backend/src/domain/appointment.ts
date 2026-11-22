import { err, ok, Result } from 'neverthrow';
import type { Competition, Focus, Venue } from '../schemas/fieldValues.ts';
import type { AppointmentId } from '../schemas/ids.ts';
import type { DomainError } from './errors.ts';
import type { AppointmentEvent, MatchEvent, MatchScheduled, TrainingEvent, TrainingScheduled } from './events.ts';

type AppointmentChange = AppointmentEvent | MatchEvent | TrainingEvent;

/** Erzeugt ein Event im Team (`Team.#raise`): anwenden und als Pending Event vormerken. */
export type RaiseEvent = (event: AppointmentChange) => void;

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
 * Trainings gemeinsam haben. Termine sind Teil des Team-Aggregates: Ihre Geschäftsmethoden prüfen
 * die Regeln des Termins und erzeugen Events über `raise`, das auf `Team.#raise` zeigt. Das Team
 * merkt die Events vor und gibt sie über `apply` an den Termin zurück.
 */
export abstract class Appointment {
  readonly id: AppointmentId;
  protected readonly raise: RaiseEvent;
  #date: string;
  #hasNotes = false;

  protected constructor(id: AppointmentId, date: string, raise: RaiseEvent) {
    this.id = id;
    this.#date = date;
    this.raise = raise;
  }

  reschedule(date: string): Result<void, DomainError> {
    if (date !== this.#date) this.raise({ type: 'AppointmentRescheduled', data: { appointmentId: this.id, date } });
    return ok(undefined);
  }

  /** Die Notiz liegt als Datei vor; jedes Schreiben ist eine Änderung. */
  writeNotes(): Result<void, DomainError> {
    this.raise({ type: 'AppointmentNotesWritten', data: { appointmentId: this.id } });
    return ok(undefined);
  }

  removeNotes(): Result<void, DomainError> {
    if (this.#hasNotes) this.raise({ type: 'AppointmentNotesRemoved', data: { appointmentId: this.id } });
    return ok(undefined);
  }

  /** Übernimmt ein Event in den Zustand. Unterklassen behandeln ihre eigenen Events zuerst. */
  apply(event: AppointmentChange): void {
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

  constructor(scheduled: MatchScheduled, raise: RaiseEvent) {
    super(scheduled.appointmentId, scheduled.date, raise);
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

  changeMatchday(matchday: number): Result<void, DomainError> {
    return wholeNumber('matchday', matchday, 1).map((valid) => {
      if (valid !== this.#matchday) {
        this.raise({ type: 'MatchdayChanged', data: { appointmentId: this.id, matchday: valid } });
      }
    });
  }

  removeMatchday(): Result<void, DomainError> {
    if (this.#matchday !== null) this.raise({ type: 'MatchdayRemoved', data: { appointmentId: this.id } });
    return ok(undefined);
  }

  changeOpponent(opponent: string): Result<void, DomainError> {
    return validOpponent(opponent).map((valid) => {
      if (valid !== this.#opponent) {
        this.raise({ type: 'OpponentChanged', data: { appointmentId: this.id, opponent: valid } });
      }
    });
  }

  removeOpponent(): Result<void, DomainError> {
    if (this.#opponent !== null) this.raise({ type: 'OpponentRemoved', data: { appointmentId: this.id } });
    return ok(undefined);
  }

  changeVenue(venue: Venue): Result<void, DomainError> {
    if (venue !== this.#venue) this.raise({ type: 'VenueChanged', data: { appointmentId: this.id, venue } });
    return ok(undefined);
  }

  removeVenue(): Result<void, DomainError> {
    if (this.#venue !== null) this.raise({ type: 'VenueRemoved', data: { appointmentId: this.id } });
    return ok(undefined);
  }

  changeCompetition(competition: Competition): Result<void, DomainError> {
    if (competition !== this.#competition) {
      this.raise({ type: 'CompetitionChanged', data: { appointmentId: this.id, competition } });
    }
    return ok(undefined);
  }

  removeCompetition(): Result<void, DomainError> {
    if (this.#competition !== null) this.raise({ type: 'CompetitionRemoved', data: { appointmentId: this.id } });
    return ok(undefined);
  }

  recordResult(goalsFor: number, goalsAgainst: number): Result<void, DomainError> {
    return wholeNumber('goalsFor', goalsFor, 0)
      .andThen(() => wholeNumber('goalsAgainst', goalsAgainst, 0))
      .map(() => {
        const unchanged = this.#result?.goalsFor === goalsFor && this.#result.goalsAgainst === goalsAgainst;
        if (!unchanged) {
          this.raise({ type: 'MatchResultRecorded', data: { appointmentId: this.id, goalsFor, goalsAgainst } });
        }
      });
  }

  clearResult(): Result<void, DomainError> {
    if (this.#result !== null) this.raise({ type: 'MatchResultCleared', data: { appointmentId: this.id } });
    return ok(undefined);
  }

  override apply(event: AppointmentChange): void {
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

  constructor(scheduled: TrainingScheduled, raise: RaiseEvent) {
    super(scheduled.appointmentId, scheduled.date, raise);
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

  changeDuration(minutes: number): Result<void, DomainError> {
    return validTrainingDuration(minutes).map((valid) => {
      if (valid !== this.#duration) {
        this.raise({ type: 'TrainingDurationChanged', data: { appointmentId: this.id, minutes: valid } });
      }
    });
  }

  /** `null` oder ein leeres Thema entfernt das Thema. */
  changeTopic(topic: string | null): Result<void, DomainError> {
    const normalized = normalizeTopic(topic);
    if (normalized !== this.#topic) {
      this.raise({ type: 'TrainingTopicChanged', data: { appointmentId: this.id, topic: normalized } });
    }
    return ok(undefined);
  }

  changeFocus(focus: Focus): Result<void, DomainError> {
    const normalized = normalizeFocus(focus);
    if (!sameFocus(normalized, this.#focus)) {
      this.raise({ type: 'TrainingFocusChanged', data: { appointmentId: this.id, focus: normalized } });
    }
    return ok(undefined);
  }

  override apply(event: AppointmentChange): void {
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
