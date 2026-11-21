import assert from 'node:assert/strict';
import { type DataTable, Given, Then, When } from '@cucumber/cucumber';
import { Team } from '../../src/domain/team.ts';
import { positionSchema } from '../../src/schemas/fieldValues.ts';
import type { KaderblickWorld } from '../support/world.ts';

const NUMBER_COLUMNS = new Set(['teamId', 'shirtNumber', 'number']);

/** Wandelt eine Tabellenzeile in ein Event: leere Zelle = null, Namen in playerId = Spieler. */
function eventFromRow(world: KaderblickWorld, row: Record<string, string>): { type: string; data: object } {
  const { event: type = '', ...cells } = row;
  const data = Object.fromEntries(
    Object.entries(cells).map(([column, cell]): [string, unknown] => {
      if (cell === '') return [column, null];
      if (column === 'playerId') return [column, world.team.playerId(cell)];
      if (NUMBER_COLUMNS.has(column)) return [column, Number(cell)];
      return [column, cell];
    }),
  );
  return { type, data };
}

// Vorgeschichte

Given(
  'team {int} {string} in season {string} with tier {string}',
  function (this: KaderblickWorld, teamId: number, name: string, season: string, tier: string) {
    this.team.given({ type: 'TeamCreated', data: { teamId, name, season, tier } });
  },
);

Given('the team has a crest', function (this: KaderblickWorld) {
  this.team.given({ type: 'CrestUploaded', data: {} });
});

Given('the team has coaches', function (this: KaderblickWorld) {
  this.team.given({ type: 'CoachesChanged', data: {} });
});

Given('the team has been deleted', function (this: KaderblickWorld) {
  this.team.given({ type: 'TeamDeleted', data: {} });
});

Given('the squad contains {string}', function (this: KaderblickWorld, player: string) {
  const playerId = this.team.playerId(player);
  this.team.given({ type: 'PlayerAddedToSquad', data: { playerId, shirtNumber: null, position: null } });
});

Given(
  'the squad contains {string} with shirt number {int}',
  function (this: KaderblickWorld, player: string, shirtNumber: number) {
    const playerId = this.team.playerId(player);
    this.team.given({ type: 'PlayerAddedToSquad', data: { playerId, shirtNumber, position: null } });
  },
);

Given(
  'the squad contains {string} with shirt number {int} and position {string}',
  function (this: KaderblickWorld, player: string, shirtNumber: number, position: string) {
    const playerId = this.team.playerId(player);
    this.team.given({
      type: 'PlayerAddedToSquad',
      data: { playerId, shirtNumber, position: positionSchema.parse(position) },
    });
  },
);

Given('{string} has been removed from the squad', function (this: KaderblickWorld, player: string) {
  this.team.given({ type: 'PlayerRemovedFromSquad', data: { playerId: this.team.playerId(player) } });
});

Given('the shirt number of {string} has been removed', function (this: KaderblickWorld, player: string) {
  this.team.given({ type: 'ShirtNumberRemoved', data: { playerId: this.team.playerId(player) } });
});

Given('the position of {string} has been removed', function (this: KaderblickWorld, player: string) {
  this.team.given({ type: 'PositionRemoved', data: { playerId: this.team.playerId(player) } });
});

Given('{string} has been deactivated', function (this: KaderblickWorld, player: string) {
  this.team.given({ type: 'PlayerDeactivated', data: { playerId: this.team.playerId(player) } });
});

Given('the profile of {string} has been noted as changed', function (this: KaderblickWorld, player: string) {
  this.team.given({ type: 'PlayerProfileChanged', data: { playerId: this.team.playerId(player) } });
});

// Geschäftsmethoden: Team

When(
  'team {int} is created with name {string}, season {string} and tier {string}',
  function (this: KaderblickWorld, teamId: number, name: string, season: string, tier: string) {
    this.team.create(Team.create({ teamId, name, season, tier }));
  },
);

When(
  'team {int} is created with name {string}, season {string} and no tier',
  function (this: KaderblickWorld, teamId: number, name: string, season: string) {
    this.team.create(Team.create({ teamId, name, season, tier: null }));
  },
);

When('the team is renamed to {string}', function (this: KaderblickWorld, name: string) {
  this.team.act((team) => team.rename(name));
});

When('the season is changed to {string}', function (this: KaderblickWorld, season: string) {
  this.team.act((team) => team.changeSeason(season));
});

When('the tier is changed to {string}', function (this: KaderblickWorld, tier: string) {
  this.team.act((team) => team.changeTier(tier));
});

When('the tier is removed', function (this: KaderblickWorld) {
  this.team.act((team) => team.changeTier(null));
});

When('a crest is uploaded', function (this: KaderblickWorld) {
  this.team.act((team) => team.uploadCrest());
});

When('the crest is removed', function (this: KaderblickWorld) {
  this.team.act((team) => team.removeCrest());
});

When('the coaches are changed', function (this: KaderblickWorld) {
  this.team.act((team) => team.changeCoaches());
});

When('the coaches are removed', function (this: KaderblickWorld) {
  this.team.act((team) => team.removeCoaches());
});

When('the team is deleted', function (this: KaderblickWorld) {
  this.team.act((team) => team.delete());
});

// Geschäftsmethoden: Kader

When('{string} is added to the squad', function (this: KaderblickWorld, player: string) {
  const playerId = this.team.playerId(player);
  this.team.act((team) => team.addPlayer({ playerId }));
});

When(
  '{string} is added to the squad with shirt number {int} and position {string}',
  function (this: KaderblickWorld, player: string, shirtNumber: number, position: string) {
    const playerId = this.team.playerId(player);
    this.team.act((team) => team.addPlayer({ playerId, shirtNumber, position: positionSchema.parse(position) }));
  },
);

When('{string} gets shirt number {int}', function (this: KaderblickWorld, player: string, number: number) {
  const playerId = this.team.playerId(player);
  this.team.act((team) => team.assignShirtNumber(playerId, number));
});

When('the shirt number of {string} is removed', function (this: KaderblickWorld, player: string) {
  const playerId = this.team.playerId(player);
  this.team.act((team) => team.removeShirtNumber(playerId));
});

When('{string} gets position {string}', function (this: KaderblickWorld, player: string, position: string) {
  const playerId = this.team.playerId(player);
  this.team.act((team) => team.changePosition(playerId, positionSchema.parse(position)));
});

When('the position of {string} is removed', function (this: KaderblickWorld, player: string) {
  const playerId = this.team.playerId(player);
  this.team.act((team) => team.removePosition(playerId));
});

When('{string} is deactivated', function (this: KaderblickWorld, player: string) {
  const playerId = this.team.playerId(player);
  this.team.act((team) => team.deactivatePlayer(playerId));
});

When('{string} is reactivated', function (this: KaderblickWorld, player: string) {
  const playerId = this.team.playerId(player);
  this.team.act((team) => team.reactivatePlayer(playerId));
});

When('{string} is removed from the squad', function (this: KaderblickWorld, player: string) {
  const playerId = this.team.playerId(player);
  this.team.act((team) => team.removePlayer(playerId));
});

When('the profile of {string} is noted as changed', function (this: KaderblickWorld, player: string) {
  const playerId = this.team.playerId(player);
  this.team.act((team) => team.noteProfileChanged(playerId));
});

// Ergebnis

Then('the following is recorded:', function (this: KaderblickWorld, table: DataTable) {
  assert.equal(this.team.result.isOk(), true, `Abgelehnt: ${JSON.stringify(this.team.result)}`);
  const expected = table.hashes().map((row) => eventFromRow(this, row));
  assert.deepEqual(this.team.recorded, expected);
});

Then('nothing is recorded', function (this: KaderblickWorld) {
  assert.equal(this.team.result.isOk(), true, `Abgelehnt: ${JSON.stringify(this.team.result)}`);
  assert.deepEqual(this.team.recorded, []);
});

Then('the team is created', function (this: KaderblickWorld) {
  assert.equal(this.team.result.isOk(), true, `Abgelehnt: ${JSON.stringify(this.team.result)}`);
  assert.equal(this.team.recorded[0]?.type, 'TeamCreated');
});

Then('it is rejected with {string}', function (this: KaderblickWorld, type: string) {
  this.team.result.match(
    () => assert.fail(`Erwartet: ${type}, aber die Methode war erfolgreich.`),
    (error) => {
      assert.equal(error.type, type);
    },
  );
  assert.deepEqual(this.team.recorded, []);
});
