/* eslint-disable max-len */
/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
import moment, { duration } from 'moment';
import logger from './monitoring/logger';
import axios from 'axios';
import * as cheerio from 'cheerio';
import SbcSet from './interfaces/Set';
import SbcChallenge from './interfaces/Challenge';

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
      const response = await axios.get(url, { headers: { 'User-Agent': 'PostmanRuntime/7.30.0' } });
      const selector = cheerio.load(response.data);
      const blocks = selector(".sbc_set_box:not(.set_box_extra)").toArray().map((el: any) => selector(el));
  
      const sets: SbcSet[] = [];
      for(const block of blocks) {
        sets.push(this.convertElementToSet(block))
      }
      const tradeableSets = sets.filter(set => set.tradeable === true);
      
        //   for(const tradeableSet of tradeableSets) {
        //     const challenges = await this.getSetChallenges(tradeableSet); // maybe promise all
        //     tradeableSet.challenges = challenges;
        //   }
      for(const tradeableSet of tradeableSets) {
        console.log(tradeableSet);
      }
  
      if (!response || response.data.error) {
        console.error(`error`);
        return null;
      }
    } catch(err: any) {
      logger.error('error while requesting sbc', {meta: err})
    }
  }

  private async getSetChallenges(sbcSet: SbcSet) {
    const url = sbcSet.url;
    const response = await axios.get(url);
    const selector = cheerio.load(response.data);
    const blocks = selector(".sbc-block").toArray().map((el: any) => selector(el));

    const challenges: SbcChallenge[] = [];
    for(const block of blocks) {
      challenges.push(await this.convertElementToChallenge(block, sbcSet));
    }

    return challenges;
  }

  private convertElementToSet(block: cheerio.Cheerio<any>): SbcSet {
    // console.log(block);
    const { packName, packAmount } = this.getPackAttributes(block);

    return {
      url: this.getSbcURl(block),
      name: this.getSbcNameFromPage(block),
      tradeable: true,
      pack_name: packName,
      pack_amount: packAmount,
    };
  }

  private async convertElementToChallenge(block: cheerio.Cheerio<any>, sbcSet: SbcSet): Promise<SbcChallenge> {
    const { packName, packAmount } = this.getPackAttributes(block);
    const challengeUrl = this.getChallengeURl(block);
    const conditionsFromFutwiz = await this.getChallengeConditions(challengeUrl);
    const conditionsOperated = this.operateConditions(conditionsFromFutwiz)

    return {
      url: challengeUrl,
      name: this.getSbcNameFromPage(block),
      tradeable: this.getIfPackTradeable(block) || sbcSet.tradeable,
      pack_name: packName || sbcSet.pack_name,
      pack_amount: packAmount || sbcSet.pack_amount,
      conditions: conditionsOperated,
    };
  }

  private getSbcURl(block: cheerio.Cheerio<any>): string {
    const aHrefUrl = block.parent().attr('href') || '';
    return this.futbinUrl + aHrefUrl;
  }

  private getChallengeURl(block: cheerio.Cheerio<any>): string {
    const aHrefUrl = block.find('.sbc-info').find('a').attr('href') || '';
    return this.futbinUrl + aHrefUrl;
  }

  private getPackAttributes(block: cheerio.Cheerio<any>): { packName: string, packAmount: number } {
    const packAttrElem: cheerio.Cheerio<any> = block
      .find('.set_box_back').find('.rewards_area').children();
    
    const packName = packAttrElem.find('.pack_small_reward_name_right').text();
    const packAmount = Number(packAttrElem.find('.pack_small_reward_count_right').text());
    return { packName, packAmount };
  }

  private async getChallengeConditions(url: string): Promise<string[]> {
    const response = await axios.get(url);
    const selector = cheerio.load(response.data);
    const conditionsText = selector(".sbc-req").toArray().map((el: any) => selector(el).text());
    return conditionsText.map(conditionText => conditionText.split('\n').filter(splittedText => splittedText !== '').join());
  }

  // TODO interfaces & operating
  private operateConditions(conditions: string[]): string[] {
    return conditions;
  }

  private getSbcNameFromPage(block: cheerio.Cheerio<any>): string {
    return block.find('.set_box_front').find('.top-set-row').text().trim();
  }

  private getIfPackTradeable(block: cheerio.Cheerio<any>): boolean {
    return block.find('.sbc-rewards').first().text().includes('Tradeable') ? true : false;
  }
}
