import { generate } from '@genql/cli';
import dotenv from 'dotenv';

dotenv.config();

const scalarTypes = {
  bigint: 'number',
  numeric: 'number',
  timestamp: 'string',
  uuid: 'string',
  MongoID: 'string',
  Date: 'Date',
  float8: 'number'
};

// eslint-disable-next-line no-console
generateGraphQLInterfaces();

async function generateGraphQLInterfaces() {
  await generatePlayersGraphQLInterfaces();
  await generateTradeGraphQLInterfaces();
  await generateArchiveGraphQLInterfaces();
}

async function generatePlayersGraphQLInterfaces() {
  await generate({
    endpoint: process.env.SERVER_PLAYERS_ENDPOINT,
    output: 'generated/players',
    onlyCJSModules: true,
    verbose: true,
    scalarTypes
  });
}

async function generateArchiveGraphQLInterfaces() {
  await generate({
    endpoint: process.env.ARCHIVE_SERVER_ENDPOINT,
    output: 'generated/archive',
    headers: {
      'x-hasura-admin-secret': process.env.ARCHIVE_SERVER_ENDPOINT_ADMIN_SECRET!,
    },
    onlyCJSModules: true,
    verbose: true,
    scalarTypes
  });
}

async function generateTradeGraphQLInterfaces() {
  await generate({
    endpoint: process.env.TRADE_ENDPOINT,
    output: 'generated/trade',
    verbose: true,
    headers: {
      'x-hasura-admin-secret': process.env.TRADE_HASURA_ADMIN_SECRET!
    },
    scalarTypes
  });
}
