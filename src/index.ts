import env from './utils/env';
import { handleUnexpectedExit, sleep } from './utils/utils';
import { createClient as createTradeClient } from './../generated/trade';
import ChallengeParser from './futwizParser';
import ChallengeFutbinParser from './futbinParser';
import DB from './api/DB';
import logger, { setConsoleLogs, setFileLogs } from './api/logger';
import ProxyManager from './proxyManager';

export type SetType =
  | 'Challenges'
  | 'Upgrades'
  | 'Foundations'
  | 'Players'
  | 'Icons'
  | 'Exchanges'
  | 'EXPIRED'
  | 'ALL'
  | 'NEW';

async function parseChallenges() {
  try {
    const nowHours: number = new Date().getUTCHours();
    const nowMinutes: number = new Date().getUTCMinutes();
    logger.debug('running at: ' + nowHours + ':' + nowMinutes);
    // if (nowHours === 18 && nowMinutes === 30) {
    const db = new DB(
      createTradeClient({
        url: env.TRADE_ENDPOINT,
        headers: {
          'x-hasura-admin-secret': env.TRADE_HASURA_ADMIN_SECRET,
        },
      })
    );

    const futbinTabs: SetType[] = [
      'Foundations',
      'Upgrades',
      'Players',
      'Challenges',
      'Icons',
      'Exchanges',
    ];

    const proxyUrls = await db.getProxiesForParser();
    const proxyThreads = 200;
    const proxyManager = new ProxyManager(proxyThreads, proxyUrls);
    await proxyManager.init();

    const fwParser = new ChallengeParser();
    const fbParser = new ChallengeFutbinParser(db, proxyManager);

    const futwizTradeableSets = await fwParser.requestTradeableChallenges();

    for (const tab of futbinTabs) {
      await fbParser.requestTradeableChallenges(tab, futwizTradeableSets!);
      await sleep(10000);
    }
    // await fbParser.requestTradeableChallenges('Challenges', true);
    // await sleep(5000);
    // await fbParser.requestTradeableChallenges('Players', true);
    // await sleep(5000);
    // await fbParser.requestTradeableChallenges('Foundations', false);

    logger.info('finished!');
    return;
    // }
  } catch (err: any) {
    logger.error('error', err);
  }
}

async function main() {
  setConsoleLogs();
  setFileLogs();
  const CHECK_INTERVAL = 60_000;
  parseChallenges();
  // setInterval(() => parseChallenges(), CHECK_INTERVAL);
}

main().catch(handleUnexpectedExit);
