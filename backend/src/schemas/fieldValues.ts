import { z } from 'zod';

// Feldwerte aus Spezifikation 6.2.6. Dieselben Werte stehen in den Events;
// die deutsche Anzeige übernimmt das Frontend.

export const positionSchema = z.enum(['TW', 'AB', 'MF', 'ST', 'AR']);
export type Position = z.infer<typeof positionSchema>;

export const strongFootSchema = z.enum(['right', 'left', 'both']);
export type StrongFoot = z.infer<typeof strongFootSchema>;

export const venueSchema = z.enum(['home', 'away', 'neutral']);
export type Venue = z.infer<typeof venueSchema>;

export const competitionSchema = z.enum(['league', 'cup', 'friendly', 'tournament']);
export type Competition = z.infer<typeof competitionSchema>;

export const participationSchema = z.enum(['starting', 'substitute', 'absent']);
export type Participation = z.infer<typeof participationSchema>;

export const attendanceSchema = z.enum(['present', 'late', 'excused', 'unexcused']);
export type Attendance = z.infer<typeof attendanceSchema>;

export const focusAreaSchema = z.enum([
  'technique',
  'tactics',
  'fitness',
  'shooting',
  'smallSidedGames',
  'athletics',
  'setPieces',
  'goalkeeping',
]);
export type FocusArea = z.infer<typeof focusAreaSchema>;

export const focusSchema = z.array(focusAreaSchema);
export type Focus = z.infer<typeof focusSchema>;

/** Eigenschaften einer Bewertung, je 0–5 Sterne (Regel 8 in 5.2). */
export const attributeSchema = z.enum(['effort', 'technique', 'gameIntelligence', 'duels', 'teamSpirit']);
export type Attribute = z.infer<typeof attributeSchema>;

/** Kartenarten einer Spielbewertung (5.3.7). */
export const cardSchema = z.enum(['yellow', 'yellowRed', 'red']);
export type Card = z.infer<typeof cardSchema>;

export const themeSchema = z.enum(['light', 'dark', 'system']);
export type Theme = z.infer<typeof themeSchema>;

/**
 * Saison im Format `JJJJ_JJ`, wobei `JJ` die letzten beiden Ziffern von `JJJJ + 1` sind
 * (z. B. `2026_27`, `2099_00`; Regel 2 in 5.2).
 */
export const seasonSchema = z
  .string()
  .regex(/^\d{4}_\d{2}$/, 'Saison muss das Format JJJJ_JJ haben')
  .refine(
    (season) => Number(season.slice(5)) === (Number(season.slice(0, 4)) + 1) % 100,
    'Zweiter Teil der Saison muss das Folgejahr sein',
  );
export type Season = z.infer<typeof seasonSchema>;
