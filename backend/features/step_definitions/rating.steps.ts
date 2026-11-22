import { Given, When } from '@cucumber/cucumber';
import {
  attendanceSchema,
  attributeSchema,
  cardSchema,
  participationSchema,
} from '../../src/schemas/fieldValues.ts';
import type { TeamEvent } from '../../src/domain/events.ts';
import type { TeamScenario } from '../support/teamScenario.ts';
import type { KaderblickWorld } from '../support/world.ts';

// Namen wie "Mia" stehen für Spieler, Kürzel wie "M1" für Termine.

function ids(scenario: TeamScenario, player: string, appointment: string) {
  return { appointmentId: scenario.appointmentId(appointment), playerId: scenario.playerId(player) };
}

/** Einsatz (Spieltag) oder Anwesenheit (Training), je nachdem, welcher Wert angegeben ist. */
function statusEvent(scenario: TeamScenario, player: string, appointment: string, status: string): TeamEvent {
  const data = ids(scenario, player, appointment);
  const participation = participationSchema.safeParse(status);
  return participation.success
    ? { type: 'ParticipationRecorded', data: { ...data, participation: participation.data } }
    : { type: 'AttendanceRecorded', data: { ...data, attendance: attendanceSchema.parse(status) } };
}

// Vorgeschichte

Given('{string} takes part in {string}', function (this: KaderblickWorld, player: string, appointment: string) {
  const status = this.team.isMatch(this.team.appointmentId(appointment)) ? 'starting' : 'present';
  this.team.given(statusEvent(this.team, player, appointment, status));
});

Given(
  '{string} takes part in {string} as {string}',
  function (this: KaderblickWorld, player: string, appointment: string, status: string) {
    this.team.given(statusEvent(this.team, player, appointment, status));
  },
);

Given(
  '{string} does not take part in {string} as {string}',
  function (this: KaderblickWorld, player: string, appointment: string, status: string) {
    this.team.given(statusEvent(this.team, player, appointment, status));
  },
);

Given(
  '{string} has performance grade {float} in {string}',
  function (this: KaderblickWorld, player: string, grade: number, appointment: string) {
    this.team.given({ type: 'PerformanceGraded', data: { ...ids(this.team, player, appointment), grade } });
  },
);

Given(
  '{string} has fairness grade {int} in {string}',
  function (this: KaderblickWorld, player: string, grade: number, appointment: string) {
    this.team.given({ type: 'FairnessGraded', data: { ...ids(this.team, player, appointment), grade } });
  },
);

Given(
  '{string} has {int} stars for {string} in {string}',
  function (this: KaderblickWorld, player: string, stars: number, attribute: string, appointment: string) {
    this.team.given({
      type: 'AttributeRated',
      data: { ...ids(this.team, player, appointment), attribute: attributeSchema.parse(attribute), stars },
    });
  },
);

Given(
  '{string} has {int} goals in {string}',
  function (this: KaderblickWorld, player: string, count: number, appointment: string) {
    this.team.given({ type: 'GoalsRecorded', data: { ...ids(this.team, player, appointment), count } });
  },
);

Given('{string} has a comment in {string}', function (this: KaderblickWorld, player: string, appointment: string) {
  this.team.given({ type: 'RatingCommentWritten', data: ids(this.team, player, appointment) });
});

Given(
  '{string} has been shown a {string} card in {string}',
  function (this: KaderblickWorld, player: string, card: string, appointment: string) {
    this.team.given({
      type: 'CardShown',
      data: { ...ids(this.team, player, appointment), card: cardSchema.parse(card) },
    });
  },
);

Given(
  'the {string} card of {string} in {string} has been withdrawn',
  function (this: KaderblickWorld, card: string, player: string, appointment: string) {
    this.team.given({
      type: 'CardWithdrawn',
      data: { ...ids(this.team, player, appointment), card: cardSchema.parse(card) },
    });
  },
);

Given(
  'the rating of {string} in {string} has been reset',
  function (this: KaderblickWorld, player: string, appointment: string) {
    this.team.given({ type: 'RatingReset', data: ids(this.team, player, appointment) });
  },
);

// Geschäftsmethoden: Bewertungen (gemeinsam)

When(
  '{string} gets performance grade {float} in {string}',
  function (this: KaderblickWorld, player: string, grade: number, appointment: string) {
    const { appointmentId, playerId } = ids(this.team, player, appointment);
    this.team.act((team) => team.gradePerformance(appointmentId, playerId, grade));
  },
);

When(
  'the performance grade of {string} in {string} is withdrawn',
  function (this: KaderblickWorld, player: string, appointment: string) {
    const { appointmentId, playerId } = ids(this.team, player, appointment);
    this.team.act((team) => team.withdrawPerformanceGrade(appointmentId, playerId));
  },
);

When(
  '{string} gets fairness grade {float} in {string}',
  function (this: KaderblickWorld, player: string, grade: number, appointment: string) {
    const { appointmentId, playerId } = ids(this.team, player, appointment);
    this.team.act((team) => team.gradeFairness(appointmentId, playerId, grade));
  },
);

When(
  'the fairness grade of {string} in {string} is withdrawn',
  function (this: KaderblickWorld, player: string, appointment: string) {
    const { appointmentId, playerId } = ids(this.team, player, appointment);
    this.team.act((team) => team.withdrawFairnessGrade(appointmentId, playerId));
  },
);

When(
  '{string} gets {float} stars for {string} in {string}',
  function (this: KaderblickWorld, player: string, stars: number, attribute: string, appointment: string) {
    const { appointmentId, playerId } = ids(this.team, player, appointment);
    const valid = attributeSchema.parse(attribute);
    this.team.act((team) => team.rateAttribute(appointmentId, playerId, valid, stars));
  },
);

When(
  'a comment is written for {string} in {string}',
  function (this: KaderblickWorld, player: string, appointment: string) {
    const { appointmentId, playerId } = ids(this.team, player, appointment);
    this.team.act((team) => team.writeRatingComment(appointmentId, playerId));
  },
);

When(
  'the comment of {string} in {string} is removed',
  function (this: KaderblickWorld, player: string, appointment: string) {
    const { appointmentId, playerId } = ids(this.team, player, appointment);
    this.team.act((team) => team.removeRatingComment(appointmentId, playerId));
  },
);

When(
  'the rating of {string} in {string} is reset',
  function (this: KaderblickWorld, player: string, appointment: string) {
    const { appointmentId, playerId } = ids(this.team, player, appointment);
    this.team.act((team) => team.resetRating(appointmentId, playerId));
  },
);

// Geschäftsmethoden: Spielbewertung

When(
  'the participation of {string} in {string} is recorded as {string}',
  function (this: KaderblickWorld, player: string, appointment: string, participation: string) {
    const { appointmentId, playerId } = ids(this.team, player, appointment);
    const valid = participationSchema.parse(participation);
    this.team.act((team) => team.recordParticipation(appointmentId, playerId, valid));
  },
);

When(
  'the goals of {string} in {string} are set to {float}',
  function (this: KaderblickWorld, player: string, appointment: string, count: number) {
    const { appointmentId, playerId } = ids(this.team, player, appointment);
    this.team.act((team) => team.recordGoals(appointmentId, playerId, count));
  },
);

When(
  'the assists of {string} in {string} are set to {float}',
  function (this: KaderblickWorld, player: string, appointment: string, count: number) {
    const { appointmentId, playerId } = ids(this.team, player, appointment);
    this.team.act((team) => team.recordAssists(appointmentId, playerId, count));
  },
);

When(
  'the saves of {string} in {string} are set to {float}',
  function (this: KaderblickWorld, player: string, appointment: string, count: number) {
    const { appointmentId, playerId } = ids(this.team, player, appointment);
    this.team.act((team) => team.recordSaves(appointmentId, playerId, count));
  },
);

When(
  '{string} is shown a {string} card in {string}',
  function (this: KaderblickWorld, player: string, card: string, appointment: string) {
    const { appointmentId, playerId } = ids(this.team, player, appointment);
    const valid = cardSchema.parse(card);
    this.team.act((team) => team.showCard(appointmentId, playerId, valid));
  },
);

When(
  'the {string} card of {string} in {string} is withdrawn',
  function (this: KaderblickWorld, card: string, player: string, appointment: string) {
    const { appointmentId, playerId } = ids(this.team, player, appointment);
    const valid = cardSchema.parse(card);
    this.team.act((team) => team.withdrawCard(appointmentId, playerId, valid));
  },
);

When('all active players are marked as starting in {string}', function (this: KaderblickWorld, match: string) {
  const matchId = this.team.appointmentId(match);
  this.team.act((team) => team.markAllStarting(matchId));
});

// Geschäftsmethoden: Trainingsbewertung

When(
  'the attendance of {string} in {string} is recorded as {string}',
  function (this: KaderblickWorld, player: string, appointment: string, attendance: string) {
    const { appointmentId, playerId } = ids(this.team, player, appointment);
    const valid = attendanceSchema.parse(attendance);
    this.team.act((team) => team.recordAttendance(appointmentId, playerId, valid));
  },
);

When('all active players are marked as present in {string}', function (this: KaderblickWorld, training: string) {
  const trainingId = this.team.appointmentId(training);
  this.team.act((team) => team.markAllPresent(trainingId));
});
