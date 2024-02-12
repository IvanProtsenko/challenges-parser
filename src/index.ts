import { duration } from 'moment';
import env from './utils/env';
import {
  handleUnexpectedExit,
  registerExitListener,
  sleep,
} from './utils/utils';
import { createClient as createTradeClient } from './../generated/trade';
import ChallengeParser from './futwizParser';
import ChallengeFutbinParser from './futbinParser';
import DB from './api/DB';
import { setConsoleLogs, setDatadogLogs, setFileLogs } from './api/logger';

main().catch(handleUnexpectedExit);
setTimeout(() => {
  throw new Error('timeout');
}, duration(60, 'minutes').asMilliseconds());

async function main() {
  registerExitListener();

  await parseChallenges();

  setTimeout(() => process.exit(0), 5000);
}

async function parseChallenges() {
  setConsoleLogs();
  setFileLogs();
  setDatadogLogs();

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
  await sleep(5000);
  await fbParser.requestTradeableChallenges('Upgrades', false);

  console.log('finished!');
  return;
}
