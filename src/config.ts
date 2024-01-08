/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable max-len */
import { duration } from 'moment';

export default {
  // bronzeChunkSize: 10,
  defaultTimeoutDelay: duration(20, 'seconds').asMilliseconds(),
  goldChunkSize: 4,
  parsingPausePerProxySet: (proxySets: number): number =>
    duration(2, 'seconds').asMilliseconds(), // Math.max(duration(10 - proxySets * 1, 'seconds').asMilliseconds(), 0),
  maxFutwizProxyThreads: 50,
  maxFutbinProxyThreads: 50,
  maxFutbinPricesProxyThreads: 100,
  maxFutbinUpdateIdsProxyThreads: 50,
  maxFutbinValidateStaticDataThreads: 100,
  maxAssertionProxyThreads: 100,
};
