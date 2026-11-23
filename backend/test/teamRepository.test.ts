import { InMemoryTeamRepository } from './helpers/inMemoryTeamRepository.ts';
import { describeTeamRepository } from './helpers/teamRepositoryContract.ts';

// Dieselben Tests laufen in test/integration/ gegen KurrentDB.
describeTeamRepository('InMemoryTeamRepository', async () => {
  const repository = new InMemoryTeamRepository();
  return {
    repository,
    tombstone: async (teamId) => {
      repository.tombstone(teamId);
    },
    appendRaw: async (teamId, type, data) => {
      repository.appendRaw(teamId, type, data);
    },
  };
});
