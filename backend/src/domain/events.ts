import { z } from 'zod';
import { positionSchema } from '../schemas/fieldValues.ts';
import { playerIdSchema, teamIdSchema } from '../schemas/ids.ts';

// Events des Streams `team-{teamId}` (Spezifikation 5.3). Ein Event hat seinen Typ in `type`
// (in KurrentDB der Event-Typ) und seinen Payload in `data` (die Event-Daten).
//
// Die Schemas prüfen nur die Form, nicht die Geschäftsregeln: Ein gespeichertes Event ist eine
// Tatsache und muss sich immer lesen lassen, auch wenn sich Regeln wie das Saisonformat ändern.
// Die Regeln prüfen die Geschäftsmethoden, bevor ein Event entsteht.

function event<const Type extends string, Data extends z.ZodObject>(type: Type, data: Data) {
  return z.object({ type: z.literal(type), data });
}

const empty = z.object({});
const playerOnly = z.object({ playerId: playerIdSchema });

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
]);

export type TeamEvent = z.infer<typeof teamEventSchema>;
