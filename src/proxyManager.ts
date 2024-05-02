/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable class-methods-use-this */
import fs from 'fs';
import axios, {
  AxiosRequestConfig, AxiosResponse
} from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
// import { duration } from 'moment';
import logger from './api/logger';
import { randomInt } from './utils/utils';
import config from './config';

export type ProxyClientData = {
  asserted: Boolean | null,
  url: string
};

export interface ResponseResult<T> {
  response: AxiosResponse<any, any>;
  success: boolean;
  traceValue: T
}

export default class ProxyManager {
  private proxyClients: ProxyClientData[];

  private initialized: Boolean = false;

  private currentProxyIndex = 0;

  debug = 0;

  get ableProxies(): ProxyClientData[] {
    return this.proxyClients.filter((pClient) => pClient.asserted === true);
  }

  get proxySets() {
    return this.ableProxies.length / this.maxProxyThreads;
  }

  constructor(
    protected readonly maxProxyThreads: number,
    proxyUrls: string[]
  ) {
    if (proxyUrls.length === 0) {
      logger.error('FATAL ERROR: no proxy clients', { proxyUrls });
    }
    this.proxyClients = this.createProxyClientsData(proxyUrls);
  }

  public async init() {
    if (!this.initialized) {
      const { faildedToAssert, successfulyAsserted } = await this.assertAllProxies();

      this.logProxies({ successfulyAsserted, faildedToAssert });
      this.proxyClients = this.ableProxies;
      this.currentProxyIndex = randomInt(0, this.proxyClients.length - 1);

      this.initialized = true;
    }
  }

  public async getProxyClients(count: number): Promise<ProxyClientData[]> {
    const { ableProxies, currentProxyIndex } = this;
    count = Math.min(count, ableProxies.length);

    this.currentProxyIndex += count;
    if (this.currentProxyIndex >= ableProxies.length) {
      this.currentProxyIndex -= ableProxies.length;
    }

    if (currentProxyIndex + count <= ableProxies.length) {
      console.log(`returning proxies from ${currentProxyIndex} to ${currentProxyIndex + count}`);
      return ableProxies.slice(currentProxyIndex, currentProxyIndex + count);
    }

    const endIndex = count - (ableProxies.length - currentProxyIndex);
    console.log(`returning proxies from ${currentProxyIndex} to ${endIndex}(${currentProxyIndex + count})`);
    return ableProxies.slice(currentProxyIndex).concat(ableProxies.slice(0, endIndex));
  }

  public async assertAllProxies(): Promise<{ successfulyAsserted: number, faildedToAssert: number }> {
    const notAssertedProxies = this.proxyClients.filter((pClient) => pClient.asserted === null);

    const assertionResults: PromiseSettledResult<{ result: boolean; identifier: string; }>[] = [];

    for (let i = 0; i < notAssertedProxies.length; i += config.maxAssertionProxyThreads) {
      assertionResults.push(...(await Promise.allSettled(
        notAssertedProxies
          .slice(i, i + config.maxAssertionProxyThreads)
          .map((clientWithProxy) => this.assertAxiosClientConnection<string>(clientWithProxy, clientWithProxy.url))
      )));
      console.log(`asserted ${i + config.maxAssertionProxyThreads}`);
    }

    const results = assertionResults
      .map((result) => (result.status === 'fulfilled' ? result.value : null))
      .filter((r) => r !== null) as { result: boolean, identifier: string }[];

    for (const notAssertedProxy of notAssertedProxies) {
      const assertionResult = results.find((result) => result.identifier === notAssertedProxy.url)?.result;
      assertionResult ? notAssertedProxy.asserted = true : notAssertedProxy.asserted = false;
    }

    return {
      successfulyAsserted: notAssertedProxies.filter((p) => p.asserted).length,
      faildedToAssert: notAssertedProxies.filter((p) => !p.asserted).length,
    };
  }

  public logProxies(
    { successfulyAsserted, faildedToAssert }: { successfulyAsserted: number, faildedToAssert: number }
  ) {
    logger.info('proxy info', { successfulyAsserted, faildedToAssert });
  }

  private getProxyUrls(filePath: string) {
    const txt = fs.readFileSync(filePath, 'utf8');
    return txt.split(/[,\r\n]+/).slice(1).filter((s) => s.trim().length > 0);
  }

  private createProxyClientsData(proxyUrls: string[]) {
    return proxyUrls.map((url): ProxyClientData => ({
      asserted: null,
      url,
    }));
  }

  public async requestWithTimeout<T>({
    proxyData,
    url,
    timeoutDelay = config.defaultTimeoutDelay,
    axiosParams = {},
    traceValue,
  }: {
    proxyData: ProxyClientData,
    url: string,
    timeoutDelay?: number,
    axiosParams?: AxiosRequestConfig,
    traceValue?: T
  }) {
    const abortSignal = function (timeoutMs: number) {
      const abortController = new AbortController();
      setTimeout(() => abortController.abort(), timeoutMs);
      return abortController.signal;
    };

    try {
      const httpsAgent = new HttpsProxyAgent(proxyData.url);
      const client = axios.create({ httpsAgent });

      const response = await client.get(url, {
        timeout: timeoutDelay,
        signal: abortSignal(timeoutDelay),
        ...axiosParams
      });

      const success: boolean = response && response.status === 200;
      if (!success) {
        logger.error('not successful request');
      }

      return { response, success, traceValue };
    } catch (error: any) {
      if (error.name === 'CanceledError') {
        proxyData.asserted = false;
        logger.warn('marked proxy as not working due to timeout', { url: proxyData.url });
      }

      throw error;
    }
  }

  private async assertAxiosClientConnection<T>(
    proxyData: ProxyClientData,
    identifier: T
  ): Promise<{ result: boolean, identifier: T }> {
    try {
      const { success } = await this.requestWithTimeout({ proxyData, url: 'https://example.com' });

      return { result: success, identifier };
    } catch (err) {
      return { result: false, identifier };
    }
  }
}