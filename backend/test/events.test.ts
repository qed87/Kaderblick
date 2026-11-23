import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { teamEventSchema } from '../src/domain/events.ts';

const playerId = '7d4a2c1e-9b3f-4e8a-a6d2-5c1f0e9b8a7d';
const appointmentId = '3b9e1f4a-2c7d-4e5b-9a8f-1d6c0b2e4f7a';

/** Je Event-Typ aus 5.3.1 bis 5.3.8 ein gültiges Beispiel. */
const examples = [
  { type: 'TeamCreated', data: { teamId: 7, name: 'U19', season: '2026_27', tier: 'Kreisliga' } },
  { type: 'TeamCreated', data: { teamId: 7, name: 'U19', season: '2026_27', tier: null } },
  { type: 'TeamRenamed', data: { name: 'U19 II' } },
  { type: 'SeasonChanged', data: { season: '2027_28' } },
  { type: 'TierChanged', data: { tier: 'Bezirksliga' } },
  { type: 'TierChanged', data: { tier: null } },
  { type: 'CrestUploaded', data: {} },
  { type: 'CrestRemoved', data: {} },
  { type: 'CoachesChanged', data: {} },
  { type: 'CoachesRemoved', data: {} },
  { type: 'TeamDeleted', data: {} },
  { type: 'PlayerAddedToSquad', data: { playerId, shirtNumber: 10, position: 'MF' } },
  { type: 'PlayerAddedToSquad', data: { playerId, shirtNumber: null, position: null } },
  { type: 'ShirtNumberAssigned', data: { playerId, number: 7 } },
  { type: 'ShirtNumberRemoved', data: { playerId } },
  { type: 'PositionChanged', data: { playerId, position: 'AR' } },
  { type: 'PositionRemoved', data: { playerId } },
  { type: 'PlayerDeactivated', data: { playerId } },
  { type: 'PlayerReactivated', data: { playerId } },
  { type: 'PlayerRemovedFromSquad', data: { playerId } },
  { type: 'PlayerProfileChanged', data: { playerId } },
  { type: 'AppointmentRescheduled', data: { appointmentId, date: '2026-09-20' } },
  { type: 'AppointmentNotesWritten', data: { appointmentId } },
  { type: 'AppointmentNotesRemoved', data: { appointmentId } },
  { type: 'AppointmentDeleted', data: { appointmentId } },
  {
    type: 'MatchScheduled',
    data: {
      appointmentId,
      date: '2026-09-12',
      matchday: 3,
      opponent: 'SV Beispiel',
      venue: 'home',
      competition: 'league',
    },
  },
  {
    type: 'MatchScheduled',
    data: { appointmentId, date: '2026-09-12', matchday: null, opponent: null, venue: null, competition: null },
  },
  { type: 'MatchdayChanged', data: { appointmentId, matchday: 4 } },
  { type: 'MatchdayRemoved', data: { appointmentId } },
  { type: 'OpponentChanged', data: { appointmentId, opponent: 'FC Muster' } },
  { type: 'OpponentRemoved', data: { appointmentId } },
  { type: 'VenueChanged', data: { appointmentId, venue: 'neutral' } },
  { type: 'VenueRemoved', data: { appointmentId } },
  { type: 'CompetitionChanged', data: { appointmentId, competition: 'tournament' } },
  { type: 'CompetitionRemoved', data: { appointmentId } },
  { type: 'MatchResultRecorded', data: { appointmentId, goalsFor: 2, goalsAgainst: 1 } },
  { type: 'MatchResultCleared', data: { appointmentId } },
  {
    type: 'TrainingScheduled',
    data: { appointmentId, date: '2026-09-15', duration: 90, topic: 'Pressing', focus: ['tactics', 'fitness'] },
  },
  { type: 'TrainingScheduled', data: { appointmentId, date: '2026-09-15', duration: 90, topic: null, focus: [] } },
  { type: 'TrainingDurationChanged', data: { appointmentId, minutes: 75 } },
  { type: 'TrainingTopicChanged', data: { appointmentId, topic: null } },
  { type: 'TrainingFocusChanged', data: { appointmentId, focus: ['goalkeeping'] } },
  { type: 'PerformanceGraded', data: { appointmentId, playerId, grade: 2.5 } },
  { type: 'PerformanceGradeWithdrawn', data: { appointmentId, playerId } },
  { type: 'FairnessGraded', data: { appointmentId, playerId, grade: 2 } },
  { type: 'FairnessGradeWithdrawn', data: { appointmentId, playerId } },
  { type: 'AttributeRated', data: { appointmentId, playerId, attribute: 'gameIntelligence', stars: 4 } },
  { type: 'RatingCommentWritten', data: { appointmentId, playerId } },
  { type: 'RatingCommentRemoved', data: { appointmentId, playerId } },
  { type: 'RatingReset', data: { appointmentId, playerId } },
  { type: 'ParticipationRecorded', data: { appointmentId, playerId, participation: 'substitute' } },
  { type: 'GoalsRecorded', data: { appointmentId, playerId, count: 2 } },
  { type: 'AssistsRecorded', data: { appointmentId, playerId, count: 1 } },
  { type: 'SavesRecorded', data: { appointmentId, playerId, count: 0 } },
  { type: 'CardShown', data: { appointmentId, playerId, card: 'yellowRed' } },
  { type: 'CardWithdrawn', data: { appointmentId, playerId, card: 'red' } },
  { type: 'AttendanceRecorded', data: { appointmentId, playerId, attendance: 'unexcused' } },
];

describe('teamEventSchema', () => {
  for (const example of examples) {
    it(`liest ${example.type} ${JSON.stringify(example.data)}`, () => {
      assert.deepEqual(teamEventSchema.parse(example), example);
    });
  }

  it('deckt alle Event-Typen aus 5.3.1 bis 5.3.8 ab', () => {
    assert.equal(new Set(examples.map((e) => e.type)).size, 52);
  });

  it('lehnt unbekannte Event-Typen ab', () => {
    assert.equal(teamEventSchema.safeParse({ type: 'TeamUpdated', data: {} }).success, false);
  });

  it('lehnt fehlende oder falsch getypte Felder ab', () => {
    for (const invalid of [
      { type: 'TeamCreated', data: { teamId: 7, name: 'U19', season: '2026_27' } },
      { type: 'TeamCreated', data: { teamId: '7', name: 'U19', season: '2026_27', tier: null } },
      { type: 'PositionChanged', data: { playerId, position: 'LV' } },
      { type: 'PlayerDeactivated', data: { playerId: 'keine-uuid' } },
      { type: 'ShirtNumberAssigned', data: { playerId, number: 7.5 } },
      { type: 'AppointmentRescheduled', data: { appointmentId, date: '12.09.2026' } },
      { type: 'VenueChanged', data: { appointmentId, venue: 'heim' } },
      { type: 'TrainingFocusChanged', data: { appointmentId, focus: ['juggling'] } },
      { type: 'AttributeRated', data: { appointmentId, playerId, attribute: 'speed', stars: 3 } },
      { type: 'GoalsRecorded', data: { appointmentId, playerId, count: 1.5 } },
      { type: 'CardShown', data: { appointmentId, playerId, card: 'blue' } },
    ]) {
      assert.equal(teamEventSchema.safeParse(invalid).success, false, JSON.stringify(invalid));
    }
  });

  it('liest Events auch dann, wenn ihre Werte heutige Regeln verletzen', () => {
    // Ein Event ist eine Tatsache; Regeln wie das Saisonformat prüft die Geschäftsmethode.
    const event = { type: 'SeasonChanged', data: { season: '2026_28' } };
    assert.deepEqual(teamEventSchema.parse(event), event);
  });

  it('übernimmt unbekannte Felder im Payload nicht', () => {
    const parsed = teamEventSchema.parse({ type: 'TeamRenamed', data: { name: 'U19', extra: 1 } });
    assert.deepEqual(parsed, { type: 'TeamRenamed', data: { name: 'U19' } });
  });
});
