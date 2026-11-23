import { err, ok, type Result } from 'neverthrow';
import type { DomainError } from './errors.ts';

/** Regel 8: ganze Zahl im erlaubten Bereich, sonst `InvalidValue` für das Feld. */
export function wholeNumber(field: string, value: number, min: number, max = Infinity): Result<number, DomainError> {
  return Number.isInteger(value) && value >= min && value <= max ? ok(value) : err({ type: 'InvalidValue', field });
}
