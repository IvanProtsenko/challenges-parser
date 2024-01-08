import { createLogger, format, transports } from 'winston';
import env from '../utils/env';

const loggerOptions = {
  ddsource: 'nodejs',
  service: env.MODE === 'fb-prices-history' ? 'futbin-parser' : 'futwiz-parser',
};

const urlOptions = new URLSearchParams(JSON.parse(JSON.stringify(loggerOptions)));

const httpTransportOptions = {
  host: 'http-intake.logs.datadoghq.eu',
  path: `/v1/input/${env.DATADOG_API_KEY}?${urlOptions.toString()}`,
  ssl: true,
  format: format.json(),
};

const logger = createLogger({
  level: 'info',
  exitOnError: false,
  transports: [
    new transports.Http(httpTransportOptions),
    new transports.Console({
      // format: format.combine(
      //   format.timestamp(),
      //   format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`),
      // ),
    }),
  ],
});

export default logger;
