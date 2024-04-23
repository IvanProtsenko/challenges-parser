import env from './utils/env';
import { handleUnexpectedExit } from './utils/utils';
import { createClient as createTradeClient } from './../generated/trade';
import ChallengeParser from './futwizParser';
import ChallengeFutbinParser from './futbinParser';
import DB from './api/DB';
import logger, { setConsoleLogs, setFileLogs } from './api/logger';

export type SetType =
  | 'Challenges'
  | 'Upgrades'
  | 'Foundations'
  | 'Players'
  | 'Icons'
  | 'EXPIRED'
  | 'ALL'
  | 'NEW';

async function parseChallenges() {
  try {
    const nowHours: number = new Date().getUTCHours();
    const nowMinutes: number = new Date().getUTCMinutes();
    logger.debug('running at: ' + nowHours + ':' + nowMinutes);
    if (nowHours === 18 && nowMinutes === 30) {
      const db = new DB(
        createTradeClient({
          url: env.TRADE_ENDPOINT,
          headers: {
            'x-hasura-admin-secret': env.TRADE_HASURA_ADMIN_SECRET,
          },
        })
      );

      const fwParser = new ChallengeParser();
      const fbParser = new ChallengeFutbinParser(db);

      // await fwParser.requestTradeableChallenges();
      await fbParser.requestTradeableChallenges('Challenges', true);
      // await sleep(5000);
      // await fbParser.requestTradeableChallenges('Players', true);
      // await sleep(5000);
      // await fbParser.requestTradeableChallenges('Foundations', false);

      logger.info('finished!');
      return;
    }
  } catch (err: any) {
    logger.error('error', err);
  }
}

async function main() {
  setConsoleLogs();
  setFileLogs();
  const CHECK_INTERVAL = 60_000;
  parseChallenges();
  setInterval(() => parseChallenges(), CHECK_INTERVAL);
}

main().catch(handleUnexpectedExit);
