/* eslint-disable max-len */
/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
import moment, { duration } from 'moment';
import logger from './monitoring/logger';
import axios from 'axios';
import * as cheerio from 'cheerio';
import SbcSet from './interfaces/Set';
import SbcChallenge from './interfaces/Challenge';

export default class ChallengeParser {
  constructor(
    // private readonly parser: WebParser,
    private futwizUrl = 'https://www.futwiz.com',
    protected lastAssertedId = 0,
    protected maxLastUpdateTime = moment
      .duration('50', 'minutes')
      .asMilliseconds()
  ) {}

  public async requestTradeableChallenges() {
    try {
      const url = `${this.futwizUrl}/en/fc24/squad-building-challenges`;
      const response = await axios.get(url);
      const selector = cheerio.load(response.data);
      const blocks = selector('.sbc-block')
        .toArray()
        .map((el: any) => selector(el));

      const sets: SbcSet[] = [];
      for (const block of blocks) {
        sets.push(this.convertElementToSet(block));
      }
      const tradeableSets = sets.filter((set) => set.tradeable === true);

      for (const tradeableSet of tradeableSets) {
        const challenges = await this.getSetChallenges(tradeableSet); // maybe promise all
        tradeableSet.challenges = challenges;
      }
      for (const tradeableSet of tradeableSets) {
        console.log(tradeableSet.challenges);
      }

      if (!response || response.data.error) {
        console.error(`error`);
        return null;
      }
    } catch (err) {
      logger.error('error while requesting sbc', { meta: err });
    }
  }

  private async getSetChallenges(sbcSet: SbcSet) {
    const url = sbcSet.url;
    const response = await axios.get(url);
    const selector = cheerio.load(response.data);
    const blocks = selector('.sbc-block')
      .toArray()
      .map((el: any) => selector(el));

    const challenges: SbcChallenge[] = [];
    for (const block of blocks) {
      challenges.push(await this.convertElementToChallenge(block, sbcSet));
    }

    return challenges;
  }

  private convertElementToSet(block: cheerio.Cheerio<any>): SbcSet {
    const { packName, packAmount } = this.getPackAttributes(block);

    return {
      url: this.getSbcURl(block),
      name: this.getSbcNameFromPage(block),
      tradeable: this.getIfPackTradeable(block),
      pack_name: packName,
      pack_amount: packAmount,
    };
  }

  private async convertElementToChallenge(
    block: cheerio.Cheerio<any>,
    sbcSet: SbcSet
  ): Promise<SbcChallenge> {
    const { packName, packAmount } = this.getPackAttributes(block);
    const challengeUrl = this.getChallengeURl(block);
    const conditionsFromFutwiz = await this.getChallengeConditions(
      challengeUrl
    );
    const conditionsOperated = this.operateConditions(conditionsFromFutwiz);

    return {
      // url: challengeUrl,
      name: this.getSbcNameFromPage(block),
      tradeable: this.getIfPackTradeable(block) || sbcSet.tradeable,
      pack_name: packName || sbcSet.pack_name,
      pack_amount: packAmount || sbcSet.pack_amount,
      conditions: conditionsOperated,
    };
  }

  private getSbcURl(block: cheerio.Cheerio<any>): string {
    const onclickUrl = block.parent().attr('onclick') || '';
    return this.futwizUrl + onclickUrl.split("'")[1];
  }

  private getChallengeURl(block: cheerio.Cheerio<any>): string {
    const aHrefUrl =
      block
        .find('.sbc-info')
        .find('a')
        .attr('href') || '';
    return this.futwizUrl + aHrefUrl;
  }

  private getPackAttributes(
    block: cheerio.Cheerio<any>
  ): { packName: string; packAmount: number } {
    const packAttrArray: string = block
      .find('.sbc-rewards')
      .first()
      .text()
      .split('\n')
      .filter((el) => el !== '')[0];

    if (packAttrArray) {
      const packName = packAttrArray.split(' x ')[0];
      const packAmount = Number(packAttrArray.split(' x ')[1]);
      return { packName, packAmount };
    } else {
      return { packName: '', packAmount: 0 };
    }
  }

  private async getChallengeConditions(url: string): Promise<string[]> {
    const response = await axios.get(url);
    const selector = cheerio.load(response.data);
    const conditionsText = selector('.sbc-req')
      .toArray()
      .map((el: any) => selector(el).text());
    return conditionsText.map((conditionText) =>
      conditionText
        .split('\n')
        .filter((splittedText) => splittedText !== '')
        .join()
    );
  }

  // TODO interfaces & operating
  private operateConditions(conditions: string[]): string[] {
    return conditions;
  }

  private getSbcNameFromPage(block: cheerio.Cheerio<any>): string {
    return block
      .find('.sbc-data')
      .find('.sbc-name')
      .first()
      .text();
  }

  private getIfPackTradeable(block: cheerio.Cheerio<any>): boolean {
    return block
      .find('.sbc-rewards')
      .first()
      .text()
      .includes('Tradeable')
      ? true
      : false;
  }
}
