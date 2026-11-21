import { type DataTable, Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { competitionSchema, focusAreaSchema, venueSchema } from '../../src/schemas/fieldValues.ts';
import { cellValue, rowValues } from '../support/tables.ts';
import type { TeamScenario } from '../support/teamScenario.ts';
import type { KaderblickWorld } from '../support/world.ts';

// Tabellenzeilen für Spieltage und Trainings. Fehlende Spalten sind "kein Wert". Die Zahlen sind
// bewusst nicht auf ganze Zahlen beschränkt, damit Szenarien auch ungültige Werte prüfen können.
const matchRow = z.object({
  appointmentId: z.string(),
  date: z.string(),
  matchday: z.number().nullable().default(null),
  opponent: z.string().nullable().default(null),
  venue: venueSchema.nullable().default(null),
  competition: competitionSchema.nullable().default(null),
});

const trainingRow = z.object({
  appointmentId: z.string(),
  date: z.string(),
  duration: z.number(),
  topic: z.string().nullable().default(null),
  focus: z.array(focusAreaSchema).default([]),
});

function singleRow(scenario: TeamScenario, table: DataTable): Record<string, unknown> {
  const [row, ...rest] = table.hashes();
  if (!row || rest.length > 0) throw new Error('Die Tabelle muss genau eine Zeile haben.');
  return rowValues(scenario, row);
}

function focusList(scenario: TeamScenario, text: string) {
  return z.array(focusAreaSchema).parse(cellValue(scenario, 'focus', text));
}

// Vorgeschichte

Given('match {string} on {string}', function (this: KaderblickWorld, match: string, date: string) {
  this.team.given({
    type: 'MatchScheduled',
    data: {
      appointmentId: this.team.appointmentId(match),
      date,
      matchday: null,
      opponent: null,
      venue: null,
      competition: null,
    },
  });
});

Given('a match with:', function (this: KaderblickWorld, table: DataTable) {
  this.team.given({ type: 'MatchScheduled', data: matchRow.parse(singleRow(this.team, table)) });
});

Given(
  'training {string} on {string} with duration {int}',
  function (this: KaderblickWorld, training: string, date: string, duration: number) {
    this.team.given({
      type: 'TrainingScheduled',
      data: { appointmentId: this.team.appointmentId(training), date, duration, topic: null, focus: [] },
    });
  },
);

Given('a training with:', function (this: KaderblickWorld, table: DataTable) {
  this.team.given({ type: 'TrainingScheduled', data: trainingRow.parse(singleRow(this.team, table)) });
});

Given('{string} has notes', function (this: KaderblickWorld, appointment: string) {
  this.team.given({ type: 'AppointmentNotesWritten', data: { appointmentId: this.team.appointmentId(appointment) } });
});

Given('{string} has been deleted', function (this: KaderblickWorld, appointment: string) {
  this.team.given({ type: 'AppointmentDeleted', data: { appointmentId: this.team.appointmentId(appointment) } });
});

Given(
  'the result of {string} is {int}:{int}',
  function (this: KaderblickWorld, match: string, goalsFor: number, goalsAgainst: number) {
    this.team.given({
      type: 'MatchResultRecorded',
      data: { appointmentId: this.team.appointmentId(match), goalsFor, goalsAgainst },
    });
  },
);

// Geschäftsmethoden: Termine (gemeinsam)

When('{string} is rescheduled to {string}', function (this: KaderblickWorld, appointment: string, date: string) {
  const appointmentId = this.team.appointmentId(appointment);
  this.team.act((team) => team.rescheduleAppointment(appointmentId, date));
});

When('notes are written for {string}', function (this: KaderblickWorld, appointment: string) {
  const appointmentId = this.team.appointmentId(appointment);
  this.team.act((team) => team.writeAppointmentNotes(appointmentId));
});

When('the notes of {string} are removed', function (this: KaderblickWorld, appointment: string) {
  const appointmentId = this.team.appointmentId(appointment);
  this.team.act((team) => team.removeAppointmentNotes(appointmentId));
});

When('{string} is deleted', function (this: KaderblickWorld, appointment: string) {
  const appointmentId = this.team.appointmentId(appointment);
  this.team.act((team) => team.deleteAppointment(appointmentId));
});

// Geschäftsmethoden: Spieltage

When('match {string} is scheduled on {string}', function (this: KaderblickWorld, match: string, date: string) {
  const matchId = this.team.appointmentId(match);
  this.team.act((team) => team.scheduleMatch({ matchId, date }));
});

When('a match is scheduled with:', function (this: KaderblickWorld, table: DataTable) {
  const { appointmentId, ...match } = matchRow.parse(singleRow(this.team, table));
  this.team.act((team) => team.scheduleMatch({ matchId: appointmentId, ...match }));
});

When('the matchday of {string} is changed to {int}', function (this: KaderblickWorld, match: string, matchday: number) {
  const matchId = this.team.appointmentId(match);
  this.team.act((team) => team.changeMatchday(matchId, matchday));
});

When('the matchday of {string} is removed', function (this: KaderblickWorld, match: string) {
  const matchId = this.team.appointmentId(match);
  this.team.act((team) => team.removeMatchday(matchId));
});

When(
  'the opponent of {string} is changed to {string}',
  function (this: KaderblickWorld, match: string, opponent: string) {
    const matchId = this.team.appointmentId(match);
    this.team.act((team) => team.changeOpponent(matchId, opponent));
  },
);

When('the opponent of {string} is removed', function (this: KaderblickWorld, match: string) {
  const matchId = this.team.appointmentId(match);
  this.team.act((team) => team.removeOpponent(matchId));
});

When('the venue of {string} is changed to {string}', function (this: KaderblickWorld, match: string, venue: string) {
  const matchId = this.team.appointmentId(match);
  this.team.act((team) => team.changeVenue(matchId, venueSchema.parse(venue)));
});

When('the venue of {string} is removed', function (this: KaderblickWorld, match: string) {
  const matchId = this.team.appointmentId(match);
  this.team.act((team) => team.removeVenue(matchId));
});

When(
  'the competition of {string} is changed to {string}',
  function (this: KaderblickWorld, match: string, competition: string) {
    const matchId = this.team.appointmentId(match);
    this.team.act((team) => team.changeCompetition(matchId, competitionSchema.parse(competition)));
  },
);

When('the competition of {string} is removed', function (this: KaderblickWorld, match: string) {
  const matchId = this.team.appointmentId(match);
  this.team.act((team) => team.removeCompetition(matchId));
});

When(
  'the result of {string} is recorded as {int}:{int}',
  function (this: KaderblickWorld, match: string, goalsFor: number, goalsAgainst: number) {
    const matchId = this.team.appointmentId(match);
    this.team.act((team) => team.recordResult(matchId, goalsFor, goalsAgainst));
  },
);

When('the result of {string} is cleared', function (this: KaderblickWorld, match: string) {
  const matchId = this.team.appointmentId(match);
  this.team.act((team) => team.clearResult(matchId));
});

// Geschäftsmethoden: Trainings

When(
  'training {string} is scheduled on {string} with duration {float}',
  function (this: KaderblickWorld, training: string, date: string, duration: number) {
    const trainingId = this.team.appointmentId(training);
    this.team.act((team) => team.scheduleTraining({ trainingId, date, duration }));
  },
);

When('a training is scheduled with:', function (this: KaderblickWorld, table: DataTable) {
  const { appointmentId, ...training } = trainingRow.parse(singleRow(this.team, table));
  this.team.act((team) => team.scheduleTraining({ trainingId: appointmentId, ...training }));
});

When(
  'the duration of {string} is changed to {int}',
  function (this: KaderblickWorld, training: string, minutes: number) {
    const trainingId = this.team.appointmentId(training);
    this.team.act((team) => team.changeTrainingDuration(trainingId, minutes));
  },
);

When('the topic of {string} is changed to {string}', function (this: KaderblickWorld, training: string, topic: string) {
  const trainingId = this.team.appointmentId(training);
  this.team.act((team) => team.changeTrainingTopic(trainingId, topic));
});

When('the topic of {string} is removed', function (this: KaderblickWorld, training: string) {
  const trainingId = this.team.appointmentId(training);
  this.team.act((team) => team.changeTrainingTopic(trainingId, null));
});

When('the focus of {string} is changed to {string}', function (this: KaderblickWorld, training: string, focus: string) {
  const trainingId = this.team.appointmentId(training);
  const areas = focusList(this.team, focus);
  this.team.act((team) => team.changeTrainingFocus(trainingId, areas));
});

// Ergebnis

Then('the training is scheduled', function (this: KaderblickWorld) {
  assert.equal(this.team.result.isOk(), true, `Abgelehnt: ${JSON.stringify(this.team.result)}`);
  assert.equal(this.team.recorded[0]?.type, 'TrainingScheduled');
});
