import {
  Client as GqlTradeClient,
  challenge_conditions_filters,
  challenge_conditions_filters_insert_input,
  current_challenges_insert_input,
} from '../../generated/trade';
import SbcSet from '../interfaces/Set';
import logger from './logger';
// import { Client as GqlArchiveClient } from '../../generated/archive';

export default class DB {
  constructor(
    protected readonly graphqlTradeClient: GqlTradeClient // protected readonly graphqlArchiveClient?: GqlArchiveClient
  ) {}

  async setCurrentSbc(sets: SbcSet[]) {
    try {
      const response = await this.graphqlTradeClient.mutation({
        insert_current_sbc: {
          __args: {
            objects: sets,
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
      console.log('DB ERROR: setCurrentSbc error', err);
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
              update_columns: [
                'futbin_price',
                'challenge_index',
                'pack_amount',
                'min_squad_rating',
                'chemistry',
                'players_number',
                'formation',
              ],
            },
          },
          affected_rows: true,
        },
      });
      return response;
    } catch (err) {
      console.log('DB ERROR: setCurrentChallenges error', err);

      challenges.map((challenge) => ({
        filters: challenge.challenge_conditions_filters?.data.forEach((data) =>
          console.log(data)
        ),
        simple: challenge.challenge_conditions_simples?.data.forEach((data) =>
          console.log(data)
        ),
      }));
      return [];
    }
  }

  async getExistingChallenges() {
    try {
      const response = await this.graphqlTradeClient.query({
        current_challenges: {
          id: true,
          name: true,
          sbc_id: true,
        },
      });
      return response.current_challenges;
    } catch (err) {
      console.log('DB ERROR: getExistingChallenges error', err);
      return [];
    }
  }

  async getProxiesForParser() {
    try {
      const response = await this.graphqlTradeClient.query({
        proxies: {
          __args: {
            where: {
              purpose: { _eq: 'parser' }
            }
          },
          host: true,
          port: true,
          username: true,
          password: true,
        }
      });

      return response.proxies.map((proxy) => `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}/`);
    } catch (error: any) {
      logger.error('getProxiesForParser error', { error, errorStr: error.toString() });
      return [];
    }
  }
}
