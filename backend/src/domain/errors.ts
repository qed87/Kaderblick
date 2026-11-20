import type { Card } from '../schemas/fieldValues.ts';
import type { AppointmentId, PlayerId } from '../schemas/ids.ts';

/**
 * Fachliche Fehler der Geschäftsmethoden (Spezifikation 5.3.9). Sie enthalten nur IDs und
 * fachliche Werte, nie personenbezogene Daten. Die Abbildung auf HTTP-Statuscodes übernehmen
 * die Routen. Fehler aus Repository und Service (z. B. `TeamNotFound`) definieren diese selbst.
 */
export type DomainError =
  | { type: 'TeamDeleted' }
  | { type: 'InvalidName' }
  | { type: 'InvalidSeason' }
  | { type: 'PlayerAlreadyInSquad'; playerId: PlayerId }
  | { type: 'PlayerNotInSquad'; playerId: PlayerId }
  | { type: 'PlayerInactive'; playerId: PlayerId }
  | { type: 'IdAlreadyUsed'; appointmentId: AppointmentId }
  | { type: 'AppointmentNotFound'; appointmentId: AppointmentId }
  | { type: 'NotParticipating'; appointmentId: AppointmentId; playerId: PlayerId }
  | { type: 'InvalidValue'; field: string }
  | { type: 'CardAlreadyShown'; appointmentId: AppointmentId; playerId: PlayerId; card: Card }
  | { type: 'CardNotShown'; appointmentId: AppointmentId; playerId: PlayerId; card: Card };
