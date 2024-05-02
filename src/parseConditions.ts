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
  return cond;
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
        const text = $(element).text().toLowerCase();

        // clubs, nations, leagues
        if (text.includes('players from')) {
          const images = Array.from($(element).find('img'));

          const property = images[0].attribs.src
            .split('/')
            .at(-2)
            ?.replace(/s$/, '')! as PlayerProperty;
          const count = Number(text.split(/(min|exactly)/i).at(-1)!);
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
              value: JSON.stringify(value),
              operation: 'in',
            });
          }
          // rarity
        } else if (text.match(/if players.+(min|max|exactly)/)) {
          const count = Number(text.split(/(min|max|exactly)/i).at(-1)!);

          conditions.filters!.push({
            property: 'rarity',
            count,
            value: '3',
            operation: 'eq',
          });
          // rarity
        } else if (text.match(/tots or totw.+(min|max|exactly)/)) {
          const count = Number(text.split(/(min|max|exactly)/i).at(-1)!);

          conditions.filters!.push({
            property: 'rarity',
            count,
            value: JSON.stringify(['3', '11']),
            operation: 'in',
          });
          // level
        } else if (text.includes('non rare')) {
          const count = Number(text.split(/(min|exactly)/i).at(-1)!);

          conditions.filters!.push({
            property: 'rarity',
            count,
            value: JSON.stringify(0),
            operation: 'eq',
          });
          // level
        } else if (text.includes('rare')) {
          const count = Number(text.split(/(min|exactly)/i).at(-1)!);

          conditions.filters!.push({
            property: 'rarity',
            count,
            value: JSON.stringify(1),
            operation: 'eq',
          });
          // level
        } else if (text.match(/player level.+(bronze|silver|gold)/)) {
          const type = text.match(/player level.+(bronze|silver|gold)/)![1];
          const value = type === 'silver' ? 64 : 74;

          conditions.filters!.push({
            property: 'rating',
            count: 11,
            value: JSON.stringify(value),
            operation: 'gt',
          });
          // partial level
        } else if (
          text.match(/(gold|silver|bronze) players: (min|max|exactly) [0-9]/)
        ) {
          const type = text.match(
            /(gold|silver|bronze) players: (min|max|exactly) [0-9]/
          )![1];
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
        } else if (text.match(/same (nation|league|club).+([0-9])/)) {
          const data = text.match(/same (nation|league|club).+([0-9])/)!;
          const property = data[1] as DistributionPlayerProperty;
          const op = data[2];

          conditions.distributions.push({
            property,
            count: Number(op),
            type: 'equal',
          });
          // diff distribution
        } else if (
          text.match(/(nationalities|leagues|clubs).+(max|min)+([0-9])/)
        ) {
          const data = text.match(
            /(nationalities|leagues|clubs).+(max|min)+([0-9])/
          )!;
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
        } else if (text.match(/(nationalities|leagues|clubs).+([0-9])/)) {
          const data = text.match(/(nationalities|leagues|clubs).+([0-9])/)!;
          const prop = data[1];
          const op = data[2];

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
            count: Number(op),
            type: 'equal',
          });
          // rating
        } else if (text.match(/minimum ovr of.+(min) [0-9]/)) {
          const data = text.match(/minimum ovr of.+(min) [0-9]/)!;
          const prop = data[1];
          const count = Number(text.split(/(min)/i).at(-1)!);
          const rating = text
            .split(/(ovr of )/i)
            .at(-1)!
            .split(' ')[0];
          let property: DistributionPlayerProperty;
          if (prop === 'nationalities') {
            property = 'nation';
          } else if (prop === 'leagues') {
            property = 'league';
          } else {
            property = 'club';
          }

          conditions.filters!.push({
            property: 'rating',
            count,
            value: rating,
            operation: 'gt',
          });
          // rating
        } else if (text.includes('squad rating')) {
          conditions.minSquadRating = Number(text.split(/min/i).at(-1)!);
        } else if (text.includes('chemistry')) {
          conditions.chemistry = Number(text.split(/min/i).at(-1)!);
        } else if (text.includes('# of players')) {
          conditions.playersNumber = Number(text.split(/:/i).at(-1)!);
        } else {
          console.log('unknown condition!', text);
        }
      });

    if (conditions.filters?.length === 0) {
      delete conditions.filters;
    }

    allConditions.push(conditions);
  });

  return allConditions;
}
