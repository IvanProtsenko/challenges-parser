/* eslint-disable max-len */
/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
import moment, { duration } from 'moment';
import logger from './monitoring/logger';
import axios from 'axios';
import * as cheerio from 'cheerio';
import SbcSet from './interfaces/Set';
import SbcChallenge from './interfaces/Challenge';
import { getExpireSbcTime } from './utils/utils';
import parseChallengeConditions from './parseConditions';

export default class ChallengeFutbinParser {
  constructor(
    // private readonly parser: WebParser,
    private futbinUrl = 'https://www.futbin.com',
    protected lastAssertedId = 0,
    protected maxLastUpdateTime = moment
      .duration('50', 'minutes')
      .asMilliseconds()
  ) {}

  public async requestTradeableChallenges() {
    try {
      const url = `${this.futbinUrl}/squad-building-challenges/Challenges`;
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'PostmanRuntime/7.30.0' },
      });
      const selector = cheerio.load(response.data);
      const blocks = selector('.sbc_set_box:not(.set_box_extra)')
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
        console.log(tradeableSet);
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
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'PostmanRuntime/7.30.0' },
    });
    const selector = cheerio.load(response.data);
    const blocks = selector('.chal_box')
      .toArray()
      .map((el: any) => selector(el));

    const challenges: SbcChallenge[] = [];
    for (const block of blocks) {
      challenges.push(await this.convertElementToChallenge(block, sbcSet));
    }

    return challenges;
  }

  private convertElementToSet(block: cheerio.Cheerio<any>): SbcSet {
    const { packName, packAmount } = this.getPackAttributesSbc(block);
    const { expiresAt, repeatable } = this.getExpiresRepeatableSbc(block);

    return {
      url: this.getSbcURl(block),
      name: this.getSbcNameFromPage(block),
      tradeable: true,
      pack_name: packName,
      pack_amount: packAmount,
      expires_at: expiresAt,
      repeatable,
    };
  }

  private async convertElementToChallenge(
    block: cheerio.Cheerio<any>,
    sbcSet: SbcSet
  ): Promise<SbcChallenge> {
    const { packName, packAmount } = this.getPackAttributesChallenge(block);
    const conditionsFromFutbin = await parseChallengeConditions(sbcSet.url);
    // const conditionsOperated = this.operateConditions(conditionsFromFutwiz);

    return {
      name: this.getChallengeNameFromPage(block),
      tradeable: true,
      pack_name: packName || sbcSet.pack_name,
      pack_amount: packAmount || sbcSet.pack_amount,
      price: this.getChallengePrice(block),
      //   conditions: conditionsOperated,
    };
  }

  private getSbcURl(block: cheerio.Cheerio<any>): string {
    const aHrefUrl = block.parent().attr('href') || '';
    return this.futbinUrl + aHrefUrl;
  }

  private getExpiresRepeatableSbc(
    block: cheerio.Cheerio<any>
  ): { expiresAt: number; repeatable: boolean } {
    const timeAttrElem = block
      .find('.set_box_front')
      .find('.set_time_rep')
      .text()
      .trim();
    const arrayTimeRepeat = timeAttrElem.split(' ');

    const remainTime: string[] = arrayTimeRepeat.slice(0, 2);
    const expiresAt = getExpireSbcTime(remainTime);
    const repeatable =
      arrayTimeRepeat[arrayTimeRepeat.length - 1] === 'Repeatable'
        ? true
        : false;
    return { expiresAt, repeatable };
  }

  private getPackAttributesSbc(
    block: cheerio.Cheerio<any>
  ): { packName: string; packAmount: number } {
    const packAttrElem: cheerio.Cheerio<any> = block
      .find('.set_box_back')
      .find('.rewards_area')
      .children();

    const packName = packAttrElem.find('.pack_small_reward_name_right').text();
    const packAmount = Number(
      packAttrElem.find('.pack_small_reward_count_right').text()
    );
    return { packName, packAmount };
  }

  private getPackAttributesChallenge(
    block: cheerio.Cheerio<any>
  ): { packName: string; packAmount: number } {
    const packAttrElem: cheerio.Cheerio<any> = block
      .find('.awards_holder_right')
      .find('.pack-reward')
      .children();

    const packName = packAttrElem.find('.pack_small_reward_name_right').text();
    const packAmount = Number(
      packAttrElem.find('.pack_small_reward_count_right').text()
    );
    return { packName, packAmount };
  }

  //   private async getChallengeConditions(
  //     block: cheerio.Cheerio<any>
  //   ): Promise<string[]> {
  //     const conditionsText = selector('.sbc-req')
  //       .toArray()
  //       .map((el: any) => selector(el).text());
  //     return conditionsText.map((conditionText) =>
  //       conditionText
  //         .split('\n')
  //         .filter((splittedText) => splittedText !== '')
  //         .join()
  //     );
  //   }

  // TODO interfaces & operating
  private operateConditions(conditions: string[]): string[] {
    return conditions;
  }

  private getSbcNameFromPage(block: cheerio.Cheerio<any>): string {
    return block
      .find('.set_box_front')
      .find('.top-set-row')
      .find('.set_name')
      .text()
      .trim();
  }

  private getChallengeNameFromPage(block: cheerio.Cheerio<any>): string {
    return block
      .find('.chal_name')
      .text()
      .trim();
  }

  private getChallengePrice(block: cheerio.Cheerio<any>): number {
    return Number(block.find('.est_chal_prices_holder').attr('data-ps-price'));
  }
}
