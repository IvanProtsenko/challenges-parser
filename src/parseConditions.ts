import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  Conditions,
  DistributionPlayerProperty,
  PlayerProperty,
} from './interfaces/Conditions';

export default async function parseChallengeConditions(url: string) {
  const response = await axios.get(url, {
    headers: { 'User-Agent': 'PostmanRuntime/7.30.0' },
  });
  const cond = parseConditions(response.data);
}

// TODO: zod!!!!!!!!!!
function parseConditions(html: string) {
  const allConditions: Conditions[] = [];

  const $ = cheerio.load(html);

  $('.reqs_area').each((_, el) => {
    const conditions: Conditions = {
      filters: [],
      distributions: [],
    };

    $(el)
      .find('div')
      .each((__, element) => {
        const text = $(element)
          .text()
          .toLowerCase();

        // clubs, nations, leagues
        if (text.includes('players from')) {
          const images = Array.from($(element).find('img'));

          const property = images[0].attribs.src
            .split('/')
            .at(-2)
            ?.replace(/s$/, '')! as PlayerProperty;
          const count = Number(text.split(/min/i).at(-1)!);
          const value = images.map(
            (img) => img.attribs.src.split(/\/|.png/).at(-2)!
          );

          if (value.length === 1) {
            conditions.filters!.push({
              property,
              count,
              value: value[0],
              operation: 'eq',
            });
          } else {
            conditions.filters!.push({
              property,
              count,
              value,
              operation: 'in',
            });
          }
          // rarity
        } else if (text.includes('rare')) {
          const count = Number(text.split(/min/i).at(-1)!);

          conditions.filters!.push({
            property: 'rarity',
            count,
            value: 1,
            operation: 'eq',
          });
          // level
        } else if (text.match(/player level.+(silver|gold)/)) {
          const type = text.match(/player level.+(silver|gold)/)![1];
          const value = type === 'silver' ? 64 : 74;

          conditions.filters!.push({
            property: 'rating',
            count: 11,
            value,
            operation: 'gt',
          });
          // partial level
        } else if (text.match(/(gold | silver) players/)) {
          const type = text.match(/(gold | silver) players/)![1];
          const count = Number(text.split(/min/i).at(-1)!);

          conditions.filters!.push({
            property: 'level',
            count,
            value: type,
            operation: 'eq',
          });

          // same distribution
        } else if (text.match(/same (nation|league|club).+(max|min)/)) {
          const data = text.match(/same (nation|league|club).+(max|min)/)!;
          const property = data[1] as DistributionPlayerProperty;
          const op = data[2];
          const count = Number(text.split(/(min|max)/i).at(-1)!);

          conditions.distributions.push({
            property,
            count,
            type: op === 'max' ? 'maxSame' : 'minSame',
          });
          // diff distribution
        } else if (text.match(/(nationalities|leagues|clubs).+(max|min)/)) {
          const data = text.match(/(nationalities|leagues|clubs).+(max|min)/)!;
          const prop = data[1];
          const op = data[2];
          const count = Number(text.split(/(min|max)/i).at(-1)!);

          let property: DistributionPlayerProperty;
          if (prop === 'nationalities') {
            property = 'nation';
          } else if (prop === 'leagues') {
            property = 'league';
          } else {
            property = 'club';
          }

          conditions.distributions.push({
            property,
            count,
            type: op === 'max' ? 'maxDiff' : 'minDiff',
          });
          // rating
        } else if (text.includes('squad rating')) {
          conditions.minSquadRating = Number(text.split(/min/i).at(-1)!);
        }
      });

    if (conditions.filters?.length === 0) {
      delete conditions.filters;
    }

    allConditions.push(conditions);
  });

  return allConditions;
}
