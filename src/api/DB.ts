import {
  Client as GqlTradeClient,
  current_challenges_insert_input,
} from '../../generated/trade';
import SbcSet from '../interfaces/Set';
// import { Client as GqlArchiveClient } from '../../generated/archive';
import logger from './logger';

export default class DB {
  constructor(
    protected readonly graphqlTradeClient: GqlTradeClient // protected readonly graphqlArchiveClient?: GqlArchiveClient
  ) {}

  async setCurrentSbc(sets: SbcSet[]) {
    try {
      const response = await this.graphqlTradeClient.mutation({
        insert_current_sbc: {
          __args: {
            objects: sets.map((set) => {
              delete set.challenges;
              return set;
            }),
            on_conflict: {
              constraint: 'current_sbc_pkey',
              update_columns: [],
            },
          },
          affected_rows: true,
        },
      });
      return response;
    } catch (err) {
      logger.error('DB ERROR: setCurrentSbc error', err);
      return [];
    }
  }

  async setCurrentChallenges(challenges: current_challenges_insert_input[]) {
    try {
      const response = await this.graphqlTradeClient.mutation({
        insert_current_challenges: {
          __args: {
            objects: challenges,
            on_conflict: {
              constraint: 'current_challenges_pkey',
              update_columns: [],
            },
          },
          affected_rows: true,
        },
      });
      return response;
    } catch (err) {
      logger.error('DB ERROR: setCurrentChallenges error', err);
      return [];
    }
  }
}
