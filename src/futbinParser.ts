/* eslint-disable max-len */
/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
import * as cheerio from 'cheerio';
import SbcSet from './interfaces/Set';
import SbcChallenge from './interfaces/Challenge';
import { getExpireSbcTime, sbcToDBChallenge, sleep } from './utils/utils';
import parseChallengeConditions from './parseConditions';
import DB from './api/DB';
import { SetType } from '.';
import { Conditions } from './interfaces/Conditions';
import ProxyManager, { ProxyClientData } from './proxyManager';

export default class ChallengeFutbinParser {
  private futbinUrl = 'https://www.futbin.com';
  private proxyIndex = 1;
  private proxyClients: ProxyClientData[] = []

  constructor(
    private db: DB,
    private proxyManager: ProxyManager
  ) {}

  public async requestTradeableChallenges(
    page: SetType,
    futwizTradeableSets: SbcSet[]
  ) {
    try {
      this.proxyIndex = 1;

      console.log('typeof: ' + typeof futwizTradeableSets);
      const url = `${this.futbinUrl}/squad-building-challenges/${page}`;

      this.proxyClients = await this.proxyManager.getProxyClients(200);

      const { response, success } = await this.proxyManager.requestWithTimeout({
        url,
        proxyData: this.proxyClients[0],
        axiosParams: { headers: { 'User-Agent': 'PostmanRuntime/7.30.0' } }
      })
      
      console.log('request done');
      const selector = cheerio.load(response.data);
      const blocks = selector('.sbc_set_box:not(.set_box_extra)')
        .toArray()
        .map((el: any) => selector(el));

      const sets: SbcSet[] = [];
      for (const block of blocks) {
        sets.push(this.convertElementToSet(block, futwizTradeableSets));
      }

      const tradeableSets = sets;

      // UNCOMMENT
      await this.db.setCurrentSbc(tradeableSets);
      await sleep(1000);

      

      for (const tradeableSet of tradeableSets) {
        const tradeableForSet = tradeableSet.tradeable;
        const challenges = await this.getSetChallenges(
          tradeableSet,
          futwizTradeableSets,
        ); // maybe promise all
        tradeableSet.challenges = challenges;
        if (tradeableSet.challenges.length > 1) {
          tradeableSet.challenges.push({
            name: tradeableSet.name + '_global',
            tradeable: tradeableForSet,
            pack_name: tradeableSet.pack_name,
            pack_amount: tradeableSet.pack_amount,
            players_number: 0,
            price: 0,
          });
        }

        await sleep(5000);
      }

      const existingChallenges = await this.db.getExistingChallenges();
      for (const tradeableSet of tradeableSets) {
        const challenges = sbcToDBChallenge(tradeableSet);
        const uniqueChallenges = challenges.filter((challenge) => {
          if (
            existingChallenges.filter(
              (existingChallenge) =>
                existingChallenge.name === challenge.name &&
                existingChallenge.sbc_id === challenge.sbc_id
            ).length === 0
          ) {
            return challenge;
          }
        });

        // UNCOMMENT
        await this.db.setCurrentChallenges(uniqueChallenges);
      }

      if (!response || response.data.error) {
        console.error(`error`);
        return null;
      }
    } catch (err) {
      console.log('error while requesting sbc', err);
    }
  }

  private async getSetChallenges(sbcSet: SbcSet, futwizSets: SbcSet[]) {
    try {
      const url = sbcSet.url;

      const { response, success } = await this.proxyManager.requestWithTimeout({
        url,
        proxyData: this.proxyClients[this.proxyIndex],
        axiosParams: { headers: { 'User-Agent': 'PostmanRuntime/7.30.0' } }
      })

      this.incrementProxyIndex();
      
      const selector = cheerio.load(response.data);
      const blocks = selector('.main_chal_box')
        .toArray()
        .map((el: any) => selector(el));

      const challenges: SbcChallenge[] = [];
      const conditionsFromFutbin = await parseChallengeConditions(sbcSet.url);

      for (const [index, block] of blocks.entries()) {
        challenges.push(
          await this.convertElementToChallenge(
            block,
            sbcSet,
            futwizSets,
            conditionsFromFutbin[index],
          )
        );
      }

      return challenges;
    } catch (err: any) {
      console.log('error in getSetChallenges', err);
      return [];
    }
  }

  private convertElementToSet(
    block: cheerio.Cheerio<any>,
    futwizSets: SbcSet[]
  ): SbcSet {
    const { packName, packAmount } = this.getPackAttributesSbc(block);
    const { expiresAt, repeatable } = this.getExpiresRepeatableSbc(block);
    const url = this.getSbcURl(block);
    const id = this.getIdFromUrl(url);
    const name = this.getSbcNameFromPage(block);
    const futwizSet = futwizSets.filter((set) => set.name === name);
    const tradeable = futwizSet.length > 0 ? futwizSet[0].tradeable : false;

    return {
      url,
      id,
      name,
      tradeable,
      pack_name: packName,
      pack_amount: packAmount,
      expires_at: expiresAt,
      repeatable,
    };
  }

  private getIdFromUrl = (url: string): number =>
    Number(url.slice(url.lastIndexOf('/') + 1));

  private async convertElementToChallenge(
    block: cheerio.Cheerio<any>,
    sbcSet: SbcSet,
    futwizSets: SbcSet[],
    condition: Conditions,
  ): Promise<SbcChallenge> {
    const { packName, packAmount } = this.getPackAttributesChallenge(block);

    await sleep(1000);
    const formation = await this.getChallengeFormation(block, this.proxyClients[this.proxyIndex]);
    this.incrementProxyIndex();
    await sleep(1000);
    const formationFromPage = await this.getChallengeFormationFromPage(block, this.proxyClients[this.proxyIndex]);
    this.incrementProxyIndex();
    await sleep(1000);

    const name = this.getChallengeNameFromPage(block);
    const futwizSet = futwizSets.filter((set) => set.name === sbcSet.name);

    let tradeable = false;
    if (futwizSet.length > 0) {
      const futwizChallenge = futwizSet[0].challenges!.filter(
        (challenge) => challenge.name === name
      )[0];
      if (futwizChallenge) {
        tradeable = futwizChallenge.tradeable;
      }
    }

    return {
      name,
      tradeable,
      pack_name: packName || sbcSet.pack_name,
      pack_amount: packAmount || sbcSet.pack_amount,
      price: this.getChallengePrice(block),
      min_squad_rating: condition.minSquadRating,
      chemistry: condition.chemistry,
      players_number: condition.playersNumber!,
      formation: formationFromPage || formation,
      challenge_conditions_filters: condition.filters ?? undefined,
      challenge_conditions_simples: condition.distributions ?? undefined,
    };
  }

  private getSbcURl(block: cheerio.Cheerio<any>): string {
    const aHrefUrl = block.parent().attr('href') || '';
    return this.futbinUrl + aHrefUrl;
  }

  private getExpiresRepeatableSbc(block: cheerio.Cheerio<any>): {
    expiresAt: number;
    repeatable: boolean;
  } {
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

  private getPackAttributesSbc(block: cheerio.Cheerio<any>): {
    packName: string;
    packAmount: number;
  } {
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

  private getPackAttributesChallenge(block: cheerio.Cheerio<any>): {
    packName: string;
    packAmount: number;
  } {
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

  private getSbcNameFromPage(block: cheerio.Cheerio<any>): string {
    return block
      .find('.set_box_front')
      .find('.top-set-row')
      .find('.set_name')
      .text()
      .trim();
  }

  private getChallengeNameFromPage(block: cheerio.Cheerio<any>): string {
    return block.find('.chal_name').text().trim();
  }

  private getChallengePrice(block: cheerio.Cheerio<any>): number {
    return Number(block.find('.est_chal_prices_holder').attr('data-ps-price'));
  }

  private async getChallengeFormation(
    block: cheerio.Cheerio<any>,
    proxyData: ProxyClientData
  ): Promise<string> {
    try {
      const url = this.futbinUrl + block.find('a.chal_view_btn').attr('href');

      if (url) {
        const { response, success } = await this.proxyManager.requestWithTimeout({
          url,
          proxyData,
          axiosParams: { headers: { 'User-Agent': 'PostmanRuntime/7.30.0' } }
        })
  
        const selector = cheerio.load(response.data);
        const formation = selector('.chal_formation_text').text().trim();
        return formation;
      }
  
      return '';
    } catch(err: any) {
      console.log('error in getChallengeFormation: ' + err);
      return '';
    }
  }

  private async getChallengeFormationFromPage(
    block: cheerio.Cheerio<any>,
    proxyData: ProxyClientData
  ): Promise<string> {
    try {
      const siblings = block.find('a.chal_view_btn').siblings();
      const url = this.futbinUrl + siblings[1].attribs.href;
  
      if (url) {
        const { response, success } = await this.proxyManager.requestWithTimeout({
          url,
          proxyData,
          axiosParams: { headers: { 'User-Agent': 'PostmanRuntime/7.30.0' } }
        })
  
        const selector = cheerio.load(response.data);
        const area = selector('div.challenge_requirements').toArray();
        for (const [index, block] of area.entries()) {
          const formationBlock = selector(block).attr('data-chal-reqs');
          if (formationBlock) {
            const formation = JSON.parse(formationBlock).formation;
            const formattedFormation = this.formatFormation(formation);
            return formattedFormation;
          }
        }
      }
  
      return '';
    } catch (err: any) {
      console.log('error in getChallengeFormationFromPage: ' + err);
      return '';
    }
  }

  private formatFormation(formation: string): string {
    const splittedFormation = formation.split('-');
    const baseFormation = splittedFormation[0].split('').join('-');
    if (splittedFormation.length === 1) {
      return baseFormation;
    } else {
      return baseFormation + '[' + splittedFormation[1] + ']';
    }
  }

  private incrementProxyIndex() {
    if(this.proxyIndex === this.proxyClients.length-1) {
      this.proxyIndex = 0;
    } else {
      this.proxyIndex++;
    }
  } 
}
