import { duration } from 'moment';
import env from './utils/env';
import { handleUnexpectedExit, registerExitListener } from './utils/utils';
import ChallengeParser from './futwizParser';
import logger from './monitoring/logger';
import ChallengeFutbinParser from './futbinParser';

main().catch(handleUnexpectedExit);
setTimeout(() => {
  throw new Error('timeout');
}, duration(60, 'minutes').asMilliseconds());

async function main() {
  registerExitListener();

  parseChallenges();

  setTimeout(() => process.exit(0), 5000);
}

async function parseChallenges() {
  //   const proxyManager = new ProxyManager(config.maxFutbinProxyThreads);
  //   await proxyManager.init();
  //   const parsingPauseDelay = config.parsingPausePerProxySet(proxyManager.proxySets);

  const fwParser = new ChallengeParser();
  const fbParser = new ChallengeFutbinParser();

  // await fwParser.requestTradeableChallenges();
  await fbParser.requestTradeableChallenges();
}
