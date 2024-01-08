import dotenv from 'dotenv';

dotenv.config();

const RequiredEnvVars = [
  'SERVER_PLAYERS_ENDPOINT',
  'DATADOG_API_KEY',
  'TRADE_ENDPOINT',
  'TRADE_HASURA_ADMIN_SECRET',
  'ARCHIVE_SERVER_ENDPOINT',
  'ARCHIVE_SERVER_ENDPOINT_ADMIN_SECRET'
] as const;
const OptionalEnvVars = [
  'PORT',
  'MODE',
  'PLAYERS_TYPE',
] as const;

const requiredEnv = {} as Record<typeof RequiredEnvVars[number], string>;
for (const key of RequiredEnvVars) {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error(`The environment variable "${key}" cannot be "undefined".`);
  }
  requiredEnv[key] = value;
}

const optionalEnv = {} as Partial<Record<typeof OptionalEnvVars[number], string>>;
for (const key of OptionalEnvVars) {
  optionalEnv[key] = process.env[key];
}

const env = { ...requiredEnv, ...optionalEnv };

export default env;
