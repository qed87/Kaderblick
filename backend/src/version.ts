import { readFile } from 'node:fs/promises';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { z } from 'zod';

// Liegt aus src/ und aus dist/ eine Ebene höher.
const PACKAGE_JSON = new URL('../package.json', import.meta.url);

const packageJsonSchema = z.object({ version: z.string().min(1) });

export type VersionError = { type: 'VersionUnreadable'; message: string };

export function parseVersion(content: string): Result<string, VersionError> {
  return Result.fromThrowable(
    (): unknown => JSON.parse(content),
    (): VersionError => ({ type: 'VersionUnreadable', message: 'package.json enthält kein gültiges JSON.' }),
  )().andThen((json): Result<string, VersionError> => {
    const parsed = packageJsonSchema.safeParse(json);
    return parsed.success
      ? ok(parsed.data.version)
      : err({ type: 'VersionUnreadable', message: 'package.json enthält keine Version.' });
  });
}

export function loadVersion(file: URL = PACKAGE_JSON): ResultAsync<string, VersionError> {
  return ResultAsync.fromPromise(
    readFile(file, 'utf8'),
    (error): VersionError => ({
      type: 'VersionUnreadable',
      message: error instanceof Error ? error.message : String(error),
    }),
  ).andThen(parseVersion);
}
