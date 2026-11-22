import type { TeamScenario } from './teamScenario.ts';

const NUMBER_COLUMNS = new Set([
  'teamId',
  'shirtNumber',
  'number',
  'matchday',
  'goalsFor',
  'goalsAgainst',
  'duration',
  'minutes',
]);

/**
 * Wandelt eine Tabellenzelle in den Wert, den ein Event bzw. eine Geschäftsmethode erwartet:
 * - leere Zelle: `null`, bei `focus` die leere Liste
 * - Zelle in Anführungszeichen: Text mit den Leerzeichen am Rand (Gherkin trimmt Zellen)
 * - `playerId` und `appointmentId`: die ID zum Namen bzw. Kürzel im Szenario
 * - Zahlen-Spalten: Zahl, `focus`: kommagetrennte Liste
 */
export function cellValue(scenario: TeamScenario, column: string, cell: string): unknown {
  if (column === 'focus') return cell === '' ? [] : cell.split(',').map((area) => area.trim());
  if (cell === '') return null;
  if (cell.length >= 2 && cell.startsWith('"') && cell.endsWith('"')) return cell.slice(1, -1);
  if (column === 'playerId') return scenario.playerId(cell);
  if (column === 'appointmentId') return scenario.appointmentId(cell);
  if (NUMBER_COLUMNS.has(column)) return Number(cell);
  return cell;
}

/** Wandelt eine Tabellenzeile in ein Objekt mit umgewandelten Werten. */
export function rowValues(scenario: TeamScenario, row: Record<string, string>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([column, cell]): [string, unknown] => [column, cellValue(scenario, column, cell)]),
  );
}

/** Wandelt eine Tabellenzeile mit Spalte `event` in ein erwartetes Event `{ type, data }`. */
export function eventFromRow(scenario: TeamScenario, row: Record<string, string>): { type: string; data: object } {
  const { event: type = '', ...cells } = row;
  return { type, data: rowValues(scenario, cells) };
}
