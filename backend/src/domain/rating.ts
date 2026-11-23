import { err, ok, type Result } from 'neverthrow';
import type { Attendance, Attribute, Card, Participation } from '../schemas/fieldValues.ts';
import type { AppointmentId, PlayerId } from '../schemas/ids.ts';
import type { DomainError } from './errors.ts';
import type { MatchRatingEvent, RatingEvent, TrainingRatingEvent } from './events.ts';
import { wholeNumber } from './values.ts';

export type RatingChange = RatingEvent | MatchRatingEvent | TrainingRatingEvent;

/** Erzeugt ein Event im Team (`Team.#raise`): anwenden und als Pending Event vormerken. */
export type RaiseRatingEvent = (event: RatingChange) => void;

/** Regel 8: Leistungsnote von 1 bis 6 in halben Schritten. */
function validGrade(grade: number): Result<number, DomainError> {
  const valid = Number.isInteger(grade * 2) && grade >= 1 && grade <= 6;
  return valid ? ok(grade) : err({ type: 'InvalidValue', field: 'grade' });
}

/**
 * Die Bewertung eines Spielers bei einem Termin (Spezifikation 3, „Bewertung als Basisklasse“).
 * Enthält Leistungsnote, Fairness, Eigenschaften und den Verweis auf den Kommentar. Ob die
 * Leistung zählt, beantwortet jede Unterklasse selbst über `counts()`; die gemeinsamen Regeln
 * (Einsatz zuerst, Werte verfallen) nutzen nur `counts()`.
 *
 * Wie Termine sind Bewertungen Teil des Team-Aggregates: Ihre Methoden prüfen die Regeln der
 * Bewertung und erzeugen Events über `raise`, das auf `Team.#raise` zeigt. Ob der Spieler im
 * Kader und aktiv ist, prüft das Team vorher.
 */
export abstract class Rating {
  protected readonly appointmentId: AppointmentId;
  protected readonly playerId: PlayerId;
  protected readonly raise: RaiseRatingEvent;
  #grade: number | null = null;
  #fairness: number | null = null;
  #attributes = new Map<Attribute, number>();
  #hasComment = false;

  constructor(appointmentId: AppointmentId, playerId: PlayerId, raise: RaiseRatingEvent) {
    this.appointmentId = appointmentId;
    this.playerId = playerId;
    this.raise = raise;
  }

  /** Ob die Leistung zählt: bei Startelf oder Eingewechselt bzw. bei Anwesend oder Verspätet. */
  abstract counts(): boolean;

  /** Ob Einsatz bzw. Anwesenheit erfasst ist, gleich welcher Wert. */
  protected abstract isRecorded(): boolean;

  gradePerformance(grade: number): Result<void, DomainError> {
    return this.requireParticipation()
      .andThen(() => validGrade(grade))
      .map((valid) => {
        if (valid !== this.#grade) this.raise({ type: 'PerformanceGraded', data: { ...this.ids(), grade: valid } });
      });
  }

  withdrawPerformanceGrade(): Result<void, DomainError> {
    return this.requireParticipation().map(() => {
      if (this.#grade !== null) this.raise({ type: 'PerformanceGradeWithdrawn', data: this.ids() });
    });
  }

  gradeFairness(grade: number): Result<void, DomainError> {
    return this.requireParticipation()
      .andThen(() => wholeNumber('fairness', grade, 1, 6))
      .map((valid) => {
        if (valid !== this.#fairness) this.raise({ type: 'FairnessGraded', data: { ...this.ids(), grade: valid } });
      });
  }

  withdrawFairnessGrade(): Result<void, DomainError> {
    return this.requireParticipation().map(() => {
      if (this.#fairness !== null) this.raise({ type: 'FairnessGradeWithdrawn', data: this.ids() });
    });
  }

  rateAttribute(attribute: Attribute, stars: number): Result<void, DomainError> {
    return this.requireParticipation()
      .andThen(() => wholeNumber('stars', stars, 0, 5))
      .map((valid) => {
        if (valid !== this.#attributes.get(attribute)) {
          this.raise({ type: 'AttributeRated', data: { ...this.ids(), attribute, stars: valid } });
        }
      });
  }

  /** Der Kommentar liegt als Datei vor und ist kein Leistungswert; jedes Schreiben ist eine Änderung. */
  writeComment(): Result<void, DomainError> {
    this.raise({ type: 'RatingCommentWritten', data: this.ids() });
    return ok(undefined);
  }

  removeComment(): Result<void, DomainError> {
    if (this.#hasComment) this.raise({ type: 'RatingCommentRemoved', data: this.ids() });
    return ok(undefined);
  }

  /** Zurück auf „nicht erfasst“: Einsatz bzw. Anwesenheit und Leistungswerte verfallen, der Kommentar bleibt. */
  reset(): Result<void, DomainError> {
    if (this.isRecorded()) this.raise({ type: 'RatingReset', data: this.ids() });
    return ok(undefined);
  }

  /** Regel 6: Leistungswerte nur bei Einsatz bzw. Anwesenheit. */
  protected requireParticipation(): Result<void, DomainError> {
    return this.counts()
      ? ok(undefined)
      : err({ type: 'NotParticipating', appointmentId: this.appointmentId, playerId: this.playerId });
  }

  /** Regel 7: Die Leistungswerte verfallen. Unterklassen ergänzen ihre eigenen Werte. */
  protected expirePerformanceValues(): void {
    this.#grade = null;
    this.#fairness = null;
    this.#attributes.clear();
  }

  /** Übernimmt ein Event in den Zustand. Unterklassen behandeln ihre eigenen Events zuerst. */
  apply(event: RatingChange): void {
    switch (event.type) {
      case 'PerformanceGraded':
        this.#grade = event.data.grade;
        break;
      case 'PerformanceGradeWithdrawn':
        this.#grade = null;
        break;
      case 'FairnessGraded':
        this.#fairness = event.data.grade;
        break;
      case 'FairnessGradeWithdrawn':
        this.#fairness = null;
        break;
      case 'AttributeRated':
        this.#attributes.set(event.data.attribute, event.data.stars);
        break;
      case 'RatingCommentWritten':
        this.#hasComment = true;
        break;
      case 'RatingCommentRemoved':
        this.#hasComment = false;
        break;
      case 'RatingReset':
        this.expirePerformanceValues();
        break;
      default:
        // Events der anderen Bewertungsart betreffen diese Bewertung nicht.
        break;
    }
  }

  /** `appointmentId` und `playerId`, die in jedem Bewertungs-Event stehen. */
  protected ids(): { appointmentId: AppointmentId; playerId: PlayerId } {
    return { appointmentId: this.appointmentId, playerId: this.playerId };
  }
}

type Counter = 'goals' | 'assists' | 'saves';

const COUNTER_EVENTS = { goals: 'GoalsRecorded', assists: 'AssistsRecorded', saves: 'SavesRecorded' } as const;

export class MatchRating extends Rating {
  #participation: Participation | null = null;
  #counters: Record<Counter, number> = { goals: 0, assists: 0, saves: 0 };
  #cards = new Set<Card>();

  counts(): boolean {
    return this.#participation === 'starting' || this.#participation === 'substitute';
  }

  protected isRecorded(): boolean {
    return this.#participation !== null;
  }

  recordParticipation(participation: Participation): Result<void, DomainError> {
    if (participation !== this.#participation) {
      this.raise({ type: 'ParticipationRecorded', data: { ...this.ids(), participation } });
    }
    return ok(undefined);
  }

  /** Für „Alle Startelf“: nur, solange noch kein Einsatz erfasst ist. */
  markStarting(): void {
    if (!this.isRecorded()) {
      this.raise({ type: 'ParticipationRecorded', data: { ...this.ids(), participation: 'starting' } });
    }
  }

  /** Regel 11: Tore, Vorlagen und Paraden werden als absoluter Wert gesetzt. */
  recordCount(counter: Counter, count: number): Result<void, DomainError> {
    return this.requireParticipation()
      .andThen(() => wholeNumber(counter, count, 0))
      .map((valid) => {
        if (valid !== this.#counters[counter]) {
          this.raise({ type: COUNTER_EVENTS[counter], data: { ...this.ids(), count: valid } });
        }
      });
  }

  /** Regel 9: Jede Kartenart höchstens einmal je Spieler und Spieltag. */
  showCard(card: Card): Result<void, DomainError> {
    return this.requireParticipation()
      .andThen(() =>
        this.#cards.has(card) ? err({ type: 'CardAlreadyShown', ...this.ids(), card } as const) : ok(undefined),
      )
      .map(() => {
        this.raise({ type: 'CardShown', data: { ...this.ids(), card } });
      });
  }

  withdrawCard(card: Card): Result<void, DomainError> {
    return this.requireParticipation()
      .andThen(() =>
        this.#cards.has(card) ? ok(undefined) : err({ type: 'CardNotShown', ...this.ids(), card } as const),
      )
      .map(() => {
        this.raise({ type: 'CardWithdrawn', data: { ...this.ids(), card } });
      });
  }

  protected override expirePerformanceValues(): void {
    super.expirePerformanceValues();
    this.#counters = { goals: 0, assists: 0, saves: 0 };
    this.#cards.clear();
  }

  override apply(event: RatingChange): void {
    switch (event.type) {
      case 'ParticipationRecorded':
        this.#participation = event.data.participation;
        if (!this.counts()) this.expirePerformanceValues();
        break;
      case 'RatingReset':
        this.#participation = null;
        super.apply(event);
        break;
      case 'GoalsRecorded':
        this.#counters.goals = event.data.count;
        break;
      case 'AssistsRecorded':
        this.#counters.assists = event.data.count;
        break;
      case 'SavesRecorded':
        this.#counters.saves = event.data.count;
        break;
      case 'CardShown':
        this.#cards.add(event.data.card);
        break;
      case 'CardWithdrawn':
        this.#cards.delete(event.data.card);
        break;
      default:
        super.apply(event);
    }
  }
}

export class TrainingRating extends Rating {
  #attendance: Attendance | null = null;

  counts(): boolean {
    return this.#attendance === 'present' || this.#attendance === 'late';
  }

  protected isRecorded(): boolean {
    return this.#attendance !== null;
  }

  recordAttendance(attendance: Attendance): Result<void, DomainError> {
    if (attendance !== this.#attendance) {
      this.raise({
        type: 'AttendanceRecorded',
        data: { ...this.ids(), attendance },
      });
    }
    return ok(undefined);
  }

  /** Für „Alle anwesend“: nur, solange noch keine Anwesenheit erfasst ist. */
  markPresent(): void {
    if (!this.isRecorded()) {
      this.raise({
        type: 'AttendanceRecorded',
        data: { ...this.ids(), attendance: 'present' },
      });
    }
  }

  override apply(event: RatingChange): void {
    switch (event.type) {
      case 'AttendanceRecorded':
        this.#attendance = event.data.attendance;
        if (!this.counts()) this.expirePerformanceValues();
        break;
      case 'RatingReset':
        this.#attendance = null;
        super.apply(event);
        break;
      default:
        super.apply(event);
    }
  }
}
