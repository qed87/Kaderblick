import { z } from 'zod';
import {
  attendanceSchema,
  attributeSchema,
  cardSchema,
  competitionSchema,
  focusSchema,
  participationSchema,
  positionSchema,
  venueSchema,
} from '../schemas/fieldValues.ts';
import { appointmentIdSchema, playerIdSchema, teamIdSchema } from '../schemas/ids.ts';

// Events des Streams `team-{teamId}` (Spezifikation 5.3). Ein Event hat seinen Typ in `type`
// (in KurrentDB der Event-Typ) und seinen Payload in `data` (die Event-Daten).
//
// Die Schemas prüfen nur die Form, nicht die Geschäftsregeln: Ein gespeichertes Event ist eine
// Tatsache und muss sich immer lesen lassen, auch wenn sich Regeln wie das Saisonformat ändern.
// Die Regeln prüfen die Geschäftsmethoden, bevor ein Event entsteht.

/**
 * Baut das Schema eines Events in der einheitlichen Form `{ type, data }`.
 *
 * Die Typparameter halten die genauen Typen fest, damit `z.infer` sie später kennt:
 * - `Type extends string`: Für einen Typparameter, der auf `string` beschränkt ist, leitet
 *   TypeScript aus einem String-Argument den Literaltyp ab, also `'TeamCreated'` statt `string`.
 *   Nur so entsteht über `type` eine Discriminated Union, in der `switch (event.type)` den Typ
 *   von `data` eingrenzt.
 * - `Data extends z.ZodObject`: behält das konkrete Schema des Payloads; mit `data: z.ZodObject`
 *   als Parametertyp gingen die einzelnen Felder verloren.
 */
function event<Type extends string, Data extends z.ZodObject>(type: Type, data: Data) {
  return z.object({ type: z.literal(type), data });
}

const empty = z.object({});
const playerOnly = z.object({ playerId: playerIdSchema });
const appointmentOnly = z.object({ appointmentId: appointmentIdSchema });

/** `data` eines Termin-Events: `appointmentId` plus die Felder aus `shape`, mit ihren genauen Typen. */
function appointment<Shape extends z.ZodRawShape>(shape: Shape) {
  return z.object({ appointmentId: appointmentIdSchema, ...shape });
}

const ratingOnly = z.object({ appointmentId: appointmentIdSchema, playerId: playerIdSchema });

/** `data` eines Bewertungs-Events: `appointmentId` und `playerId` plus die Felder aus `shape`. */
function rating<Shape extends z.ZodRawShape>(shape: Shape) {
  return z.object({ appointmentId: appointmentIdSchema, playerId: playerIdSchema, ...shape });
}

// 5.3.1 Team

const teamCreatedSchema = event(
  'TeamCreated',
  z.object({ teamId: teamIdSchema, name: z.string(), season: z.string(), tier: z.string().nullable() }),
);
const teamRenamedSchema = event('TeamRenamed', z.object({ name: z.string() }));
const seasonChangedSchema = event('SeasonChanged', z.object({ season: z.string() }));
const tierChangedSchema = event('TierChanged', z.object({ tier: z.string().nullable() }));
const crestUploadedSchema = event('CrestUploaded', empty);
const crestRemovedSchema = event('CrestRemoved', empty);
const coachesChangedSchema = event('CoachesChanged', empty);
const coachesRemovedSchema = event('CoachesRemoved', empty);
const teamDeletedSchema = event('TeamDeleted', empty);

// 5.3.2 Kader

const playerAddedToSquadSchema = event(
  'PlayerAddedToSquad',
  z.object({
    playerId: playerIdSchema,
    shirtNumber: z.number().int().nullable(),
    position: positionSchema.nullable(),
  }),
);
const shirtNumberAssignedSchema = event(
  'ShirtNumberAssigned',
  z.object({ playerId: playerIdSchema, number: z.number().int() }),
);
const shirtNumberRemovedSchema = event('ShirtNumberRemoved', playerOnly);
const positionChangedSchema = event(
  'PositionChanged',
  z.object({ playerId: playerIdSchema, position: positionSchema }),
);
const positionRemovedSchema = event('PositionRemoved', playerOnly);
const playerDeactivatedSchema = event('PlayerDeactivated', playerOnly);
const playerReactivatedSchema = event('PlayerReactivated', playerOnly);
const playerRemovedFromSquadSchema = event('PlayerRemovedFromSquad', playerOnly);
const playerProfileChangedSchema = event('PlayerProfileChanged', playerOnly);

// 5.3.3 Termine (gemeinsam)

const appointmentRescheduledSchema = event('AppointmentRescheduled', appointment({ date: z.iso.date() }));
const appointmentNotesWrittenSchema = event('AppointmentNotesWritten', appointmentOnly);
const appointmentNotesRemovedSchema = event('AppointmentNotesRemoved', appointmentOnly);
const appointmentDeletedSchema = event('AppointmentDeleted', appointmentOnly);

// 5.3.4 Spieltage

const matchScheduledSchema = event(
  'MatchScheduled',
  appointment({
    date: z.iso.date(),
    matchday: z.number().int().nullable(),
    opponent: z.string().nullable(),
    venue: venueSchema.nullable(),
    competition: competitionSchema.nullable(),
  }),
);
const matchdayChangedSchema = event('MatchdayChanged', appointment({ matchday: z.number().int() }));
const matchdayRemovedSchema = event('MatchdayRemoved', appointmentOnly);
const opponentChangedSchema = event('OpponentChanged', appointment({ opponent: z.string() }));
const opponentRemovedSchema = event('OpponentRemoved', appointmentOnly);
const venueChangedSchema = event('VenueChanged', appointment({ venue: venueSchema }));
const venueRemovedSchema = event('VenueRemoved', appointmentOnly);
const competitionChangedSchema = event('CompetitionChanged', appointment({ competition: competitionSchema }));
const competitionRemovedSchema = event('CompetitionRemoved', appointmentOnly);
const matchResultRecordedSchema = event(
  'MatchResultRecorded',
  appointment({ goalsFor: z.number().int(), goalsAgainst: z.number().int() }),
);
const matchResultClearedSchema = event('MatchResultCleared', appointmentOnly);

// 5.3.5 Trainings

const trainingScheduledSchema = event(
  'TrainingScheduled',
  appointment({ date: z.iso.date(), duration: z.number().int(), topic: z.string().nullable(), focus: focusSchema }),
);
const trainingDurationChangedSchema = event('TrainingDurationChanged', appointment({ minutes: z.number().int() }));
const trainingTopicChangedSchema = event('TrainingTopicChanged', appointment({ topic: z.string().nullable() }));
const trainingFocusChangedSchema = event('TrainingFocusChanged', appointment({ focus: focusSchema }));

// 5.3.6 Bewertungen (gemeinsam)

const performanceGradedSchema = event('PerformanceGraded', rating({ grade: z.number() }));
const performanceGradeWithdrawnSchema = event('PerformanceGradeWithdrawn', ratingOnly);
const fairnessGradedSchema = event('FairnessGraded', rating({ grade: z.number().int() }));
const fairnessGradeWithdrawnSchema = event('FairnessGradeWithdrawn', ratingOnly);
const attributeRatedSchema = event(
  'AttributeRated',
  rating({ attribute: attributeSchema, stars: z.number().int() }),
);
const ratingCommentWrittenSchema = event('RatingCommentWritten', ratingOnly);
const ratingCommentRemovedSchema = event('RatingCommentRemoved', ratingOnly);
const ratingResetSchema = event('RatingReset', ratingOnly);

// 5.3.7 Spielbewertung

const participationRecordedSchema = event(
  'ParticipationRecorded',
  rating({ participation: participationSchema }),
);
const goalsRecordedSchema = event('GoalsRecorded', rating({ count: z.number().int() }));
const assistsRecordedSchema = event('AssistsRecorded', rating({ count: z.number().int() }));
const savesRecordedSchema = event('SavesRecorded', rating({ count: z.number().int() }));
const cardShownSchema = event('CardShown', rating({ card: cardSchema }));
const cardWithdrawnSchema = event('CardWithdrawn', rating({ card: cardSchema }));

// 5.3.8 Trainingsbewertung

const attendanceRecordedSchema = event('AttendanceRecorded', rating({ attendance: attendanceSchema }));

export const teamEventSchema = z.discriminatedUnion('type', [
  teamCreatedSchema,
  teamRenamedSchema,
  seasonChangedSchema,
  tierChangedSchema,
  crestUploadedSchema,
  crestRemovedSchema,
  coachesChangedSchema,
  coachesRemovedSchema,
  teamDeletedSchema,
  playerAddedToSquadSchema,
  shirtNumberAssignedSchema,
  shirtNumberRemovedSchema,
  positionChangedSchema,
  positionRemovedSchema,
  playerDeactivatedSchema,
  playerReactivatedSchema,
  playerRemovedFromSquadSchema,
  playerProfileChangedSchema,
  appointmentRescheduledSchema,
  appointmentNotesWrittenSchema,
  appointmentNotesRemovedSchema,
  appointmentDeletedSchema,
  matchScheduledSchema,
  matchdayChangedSchema,
  matchdayRemovedSchema,
  opponentChangedSchema,
  opponentRemovedSchema,
  venueChangedSchema,
  venueRemovedSchema,
  competitionChangedSchema,
  competitionRemovedSchema,
  matchResultRecordedSchema,
  matchResultClearedSchema,
  trainingScheduledSchema,
  trainingDurationChangedSchema,
  trainingTopicChangedSchema,
  trainingFocusChangedSchema,
  performanceGradedSchema,
  performanceGradeWithdrawnSchema,
  fairnessGradedSchema,
  fairnessGradeWithdrawnSchema,
  attributeRatedSchema,
  ratingCommentWrittenSchema,
  ratingCommentRemovedSchema,
  ratingResetSchema,
  participationRecordedSchema,
  goalsRecordedSchema,
  assistsRecordedSchema,
  savesRecordedSchema,
  cardShownSchema,
  cardWithdrawnSchema,
  attendanceRecordedSchema,
]);

export type TeamEvent = z.infer<typeof teamEventSchema>;

/** Events, die einen bestehenden Termin ändern, unabhängig von seiner Art. */
export type AppointmentEvent = Extract<
  TeamEvent,
  { type: 'AppointmentRescheduled' | 'AppointmentNotesWritten' | 'AppointmentNotesRemoved' }
>;

/** Events, die einen bestehenden Spieltag ändern. */
export type MatchEvent = Extract<
  TeamEvent,
  {
    type:
      | 'MatchdayChanged'
      | 'MatchdayRemoved'
      | 'OpponentChanged'
      | 'OpponentRemoved'
      | 'VenueChanged'
      | 'VenueRemoved'
      | 'CompetitionChanged'
      | 'CompetitionRemoved'
      | 'MatchResultRecorded'
      | 'MatchResultCleared';
  }
>;

/** Events, die ein bestehendes Training ändern. */
export type TrainingEvent = Extract<
  TeamEvent,
  { type: 'TrainingDurationChanged' | 'TrainingTopicChanged' | 'TrainingFocusChanged' }
>;

/** Events, die eine Bewertung ändern, unabhängig von der Art des Termins. */
export type RatingEvent = Extract<
  TeamEvent,
  {
    type:
      | 'PerformanceGraded'
      | 'PerformanceGradeWithdrawn'
      | 'FairnessGraded'
      | 'FairnessGradeWithdrawn'
      | 'AttributeRated'
      | 'RatingCommentWritten'
      | 'RatingCommentRemoved'
      | 'RatingReset';
  }
>;

/** Events, die eine Spielbewertung ändern. */
export type MatchRatingEvent = Extract<
  TeamEvent,
  {
    type:
      | 'ParticipationRecorded'
      | 'GoalsRecorded'
      | 'AssistsRecorded'
      | 'SavesRecorded'
      | 'CardShown'
      | 'CardWithdrawn';
  }
>;

/** Events, die eine Trainingsbewertung ändern. */
export type TrainingRatingEvent = Extract<TeamEvent, { type: 'AttendanceRecorded' }>;

export type MatchScheduled = Extract<TeamEvent, { type: 'MatchScheduled' }>['data'];
export type TrainingScheduled = Extract<TeamEvent, { type: 'TrainingScheduled' }>['data'];
