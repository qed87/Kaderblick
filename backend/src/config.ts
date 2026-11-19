import { readFile } from 'node:fs/promises';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { z } from 'zod';

const MIN_ACCESS_KEY_LENGTH = 32;

const envSchema = z
  .object({
    KADERBLICK_TRAINERS_FILE: z.string().min(1),
    KADERBLICK_SESSION_KEY: z
      .string()
      .regex(/^[0-9a-fA-F]{64}$/, 'muss aus 64 Hex-Zeichen bestehen (32 Byte, z. B. "openssl rand -hex 32")'),
    KADERBLICK_KURRENTDB_URL: z.url(),
    KADERBLICK_KURRENTDB_HTTP_URL: z.url(),
    DATA_DIR: z.string().min(1).default('/data'),
    PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    TRUST_PROXY: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  })
  .transform((env) => ({
    trainersFile: env.KADERBLICK_TRAINERS_FILE,
    sessionKey: env.KADERBLICK_SESSION_KEY,
    kurrentDbUrl: env.KADERBLICK_KURRENTDB_URL,
    kurrentDbHttpUrl: env.KADERBLICK_KURRENTDB_HTTP_URL,
    dataDir: env.DATA_DIR,
    port: env.PORT,
    trustProxy: env.TRUST_PROXY,
    logLevel: env.LOG_LEVEL,
    nodeEnv: env.NODE_ENV,
  }));

const trainersFileSchema = z
  .object({
    Trainer: z.record(
      z.email(),
      z.object({
        Zugangsschlüssel: z
          .string()
          .min(MIN_ACCESS_KEY_LENGTH, `Zugangsschlüssel muss mindestens ${MIN_ACCESS_KEY_LENGTH} Zeichen lang sein`),
        Name: z.string().trim().min(1),
      }),
    ),
  })
  .transform((file) =>
    Object.entries(file.Trainer).map(([trainerId, trainer]) => ({
      trainerId,
      name: trainer.Name,
      accessKey: trainer.Zugangsschlüssel,
    })),
  )
  .superRefine((trainers, ctx) => {
    const trainersByKey = Map.groupBy(trainers, (trainer) => trainer.accessKey);
    for (const sharing of trainersByKey.values()) {
      if (sharing.length > 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['Trainer'],
          // Nur die Trainer-IDs nennen, nie den Schlüssel selbst.
          message: `Zugangsschlüssel mehrfach vergeben: ${sharing.map((trainer) => trainer.trainerId).join(', ')}`,
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;
export type Trainer = z.infer<typeof trainersFileSchema>[number];
export type Config = Env & { trainers: Trainer[] };

export type ConfigError =
  | { type: 'InvalidEnvironment'; message: string }
  | { type: 'TrainersFileUnreadable'; path: string; message: string }
  | { type: 'InvalidTrainersFile'; path: string; message: string };

export function parseEnv(env: Record<string, string | undefined>): Result<Env, ConfigError> {
  const parsed = envSchema.safeParse(env);
  return parsed.success
    ? ok(parsed.data)
    : err({ type: 'InvalidEnvironment', message: z.prettifyError(parsed.error) });
}

export function parseTrainers(content: string, path: string): Result<Trainer[], ConfigError> {
  return Result.fromThrowable(
    (): unknown => JSON.parse(content),
    (): ConfigError => ({ type: 'InvalidTrainersFile', path, message: 'Die Datei enthält kein gültiges JSON.' }),
  )().andThen((json): Result<Trainer[], ConfigError> => {
    const parsed = trainersFileSchema.safeParse(json);
    return parsed.success
      ? ok(parsed.data)
      : err({ type: 'InvalidTrainersFile', path, message: z.prettifyError(parsed.error) });
  });
}

export function loadConfig(env: Record<string, string | undefined>): ResultAsync<Config, ConfigError> {
  return parseEnv(env).asyncAndThen((parsedEnv) =>
    ResultAsync.fromPromise(
      readFile(parsedEnv.trainersFile, 'utf8'),
      (error): ConfigError => ({
        type: 'TrainersFileUnreadable',
        path: parsedEnv.trainersFile,
        message: error instanceof Error ? error.message : String(error),
      }),
    )
      .andThen((content) => parseTrainers(content, parsedEnv.trainersFile))
      .map((trainers) => ({ ...parsedEnv, trainers })),
  );
}

export function describeConfigError(error: ConfigError): string {
  switch (error.type) {
    case 'InvalidEnvironment':
      return `Ungültige Umgebungsvariablen:\n${error.message}`;
    case 'TrainersFileUnreadable':
      return `Trainer-Konfiguration ${error.path} kann nicht gelesen werden: ${error.message}`;
    case 'InvalidTrainersFile':
      return `Ungültige Trainer-Konfiguration ${error.path}:\n${error.message}`;
  }
}
