import { ANY, jsonEvent, KurrentDBClient } from '@kurrent/kurrentdb-client';
import { KurrentTeamRepository } from '../../src/repositories/kurrentTeamRepository.ts';
import { teamStreamName } from '../../src/repositories/teamRepository.ts';
import { describeTeamRepository } from '../helpers/teamRepositoryContract.ts';

// Läuft gegen eine echte KurrentDB, lokal aus compose.dev.yaml: `npm run test:integration`.
const url = process.env.KADERBLICK_KURRENTDB_URL ?? 'kurrentdb://localhost:2113?tls=false';

describeTeamRepository('KurrentTeamRepository', async () => {
  const client = KurrentDBClient.connectionString(url);
  return {
    repository: new KurrentTeamRepository(client),
    // Testaufbau, kein Schreibvorgang eines Aggregates: Hier ist ANY erlaubt.
    tombstone: async (teamId) => {
      await client.tombstoneStream(teamStreamName(teamId));
    },
    appendRaw: async (teamId, type, data) => {
      await client.appendToStream(teamStreamName(teamId), jsonEvent({ type, data: data as Record<string, unknown> }), {
        streamState: ANY,
      });
    },
    close: () => client.dispose(),
  };
});
