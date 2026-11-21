import { z } from 'zod';

// IDs aus Spezifikation 6.1.1: Teams eine fortlaufende Nummer, alles andere eine UUID.

export const teamIdSchema = z.number().int().positive();
export type TeamId = z.infer<typeof teamIdSchema>;

export const playerIdSchema = z.uuid();
export type PlayerId = z.infer<typeof playerIdSchema>;

/** ID eines Termins, also eines Spieltags (`matchId`) oder Trainings (`trainingId`). */
export const appointmentIdSchema = z.uuid();
export type AppointmentId = z.infer<typeof appointmentIdSchema>;
