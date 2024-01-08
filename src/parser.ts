/* eslint-disable max-len */
/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
import moment, { duration } from 'moment';
import logger from './monitoring/logger';
import { chunkArray, sleep } from '../src/utils/utils';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as cheerio from 'cheerio';
import SbcSet from './interfaces/Set';
import SbcChallenge from './interfaces/Challenge';

type HourlyPriceData = {
  resource_id: number;
  price: number;
  timestamp: number;
};

type GetPlayerPricesResult =
  | {
      success: true;
      prices: HourlyPriceData[];
    }
  | {
      success: false;
      resourceId: number;
    };

type UpdateParams = {
  resourceIds: number[];
  delay: number;
  retry: boolean;
  writeSummaryLog: boolean;
};

export default class ChallengeParser {
  constructor(
    // private readonly parser: WebParser,
    private futwizUrl = 'https://www.futwiz.com',
    protected lastAssertedId = 0,
    protected maxLastUpdateTime = moment
      .duration('50', 'minutes')
      .asMilliseconds()
  ) {}

  async requestChallenges(): Promise<any> {
    try {
      await this.requestTradeableChallenges()
    } catch (err) {
      console.error(`unhandled error`, err);
      return null;
    }
  }

  async requestTradeableChallenges() {
    const url = `${this.futwizUrl}/en/fc24/squad-building-challenges`;
    const response = await axios.get(url);
    const selector = cheerio.load(response.data);
    const blocks = selector(".sbc-block").toArray().map((el: any) => selector(el));

    const sets: SbcSet[] = [];
    for(const block of blocks) {
      sets.push(this.convertElementToSet(block))
    }
    const tradeableSets = sets.filter(set => set.tradeable === true);
    
    for(const tradeableSet of tradeableSets) {
      const challenges = await this.getSetChallenges(tradeableSet); // maybe promise all
      tradeableSet.challenges = challenges;
    }
    for(const tradeableSet of tradeableSets) {
      console.log(tradeableSet);
    }

    if (!response || response.data.error) {
      console.error(`error`);
      return null;
    }
  }

  async getSetChallenges(sbcSet: SbcSet) {
    const url = sbcSet.url;
    const response = await axios.get(url);
    const selector = cheerio.load(response.data);
    const blocks = selector(".sbc-block").toArray().map((el: any) => selector(el));

    const challenges: SbcChallenge[] = [];
    for(const block of blocks) {
      challenges.push(this.convertElementToChallenge(block, sbcSet))
    }

    return challenges;
  }

  convertElementToSet(block: cheerio.Cheerio<any>): SbcSet {
    const { packName, packAmount } = this.getPackAttributes(block);

    return {
      url: this.getSbcURl(block),
      name: this.getSbcNameFromPage(block),
      tradeable: this.getIfPackTradeable(block),
      pack_name: packName,
      pack_amount: packAmount,
    };
  }

  convertElementToChallenge(block: cheerio.Cheerio<any>, sbcSet: SbcSet): SbcChallenge {
    const { packName, packAmount } = this.getPackAttributes(block);

    return {
      url: this.getChallengeURl(block),
      name: this.getSbcNameFromPage(block),
      tradeable: this.getIfPackTradeable(block) || sbcSet.tradeable,
      pack_name: packName || sbcSet.pack_name,
      pack_amount: packAmount || sbcSet.pack_amount,
    };
  }

  getSbcURl(block: cheerio.Cheerio<any>): string {
    const onclickUrl = block.parent().attr('onclick') || '';
    return this.futwizUrl + onclickUrl.split("'")[1];
  }

  getChallengeURl(block: cheerio.Cheerio<any>): string {
    const aHrefUrl = block.find('.sbc-info').find('a').attr('href') || '';
    return this.futwizUrl + aHrefUrl;
  }

  getPackAttributes(block: cheerio.Cheerio<any>): { packName: string, packAmount: number } {
    const packAttrArray: string = block
      .find('.sbc-rewards').first().text().split('\n')
      .filter(el => el !== '')[0];
    
    if(packAttrArray) {
      const packName = packAttrArray.split(' x ')[0];
      const packAmount = Number(packAttrArray.split(' x ')[1]);
      return { packName, packAmount };
    } else {
      return { packName: '', packAmount: 0 };
    }
  }

  getSbcNameFromPage(block: cheerio.Cheerio<any>): string {
    return block.find('.sbc-data').find('.sbc-name').first().text();
  }

  getIfPackTradeable(block: cheerio.Cheerio<any>): boolean {
    return block.find('.sbc-rewards').first().text().includes('Tradeable') ? true : false;
  }
}
