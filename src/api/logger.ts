import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import env from '../utils/env';

const logger = createLogger({
  exitOnError: false,
  format: format.json(),
  transports: [],
});

const fileFormat = format.combine(
  format.errors({ stack: true }),
  format.timestamp({ format: () => new Date().toISOString().split(/T|\./)[1] }),
  format.splat(),
  format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  format.printf((info) => {
    const { message, timestamp, metadata } = info;
    if (Object.keys(metadata).length > 0) {
      return `[${timestamp}] ${message} ${JSON.stringify(metadata)}`;
    }
    return `[${timestamp}] ${message}`;
  })
);

export function setDatadogLogs() {
  const loggerOptions = {
    ddsource: 'nodejs',
    service: 'sbc-service',
  };

  const urlOptions = new URLSearchParams(
    JSON.parse(JSON.stringify(loggerOptions))
  );

  logger.add(
    new transports.Http({
      level: 'info',
      host: 'http-intake.logs.datadoghq.eu',
      path: `/v1/input/${env.DATADOG_API_KEY}?${urlOptions.toString()}`,
      ssl: true,
    })
  );
}

export function setFileLogs() {
  logger.add(
    new DailyRotateFile({
      level: 'debug',
      frequency: '24h',
      dirname: './logs',
      filename: '%DATE%.log',
      maxSize: '1g',
      maxFiles: '7d',
      format: fileFormat,
    })
  );
}

export function setConsoleLogs() {
  logger.add(
    new transports.Console({
      level: 'info',
      format: fileFormat,
    })
  );
}

export default logger;
