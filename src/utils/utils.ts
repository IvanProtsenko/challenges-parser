import { duration } from 'moment';
import logger from '../monitoring/logger';

export function registerExitListener() {
  ['unhandledRejection', 'uncaughtException'].forEach((event) => {
    process.on(event, handleUnexpectedExit);
  });
}

export function handleUnexpectedExit(error: any) {
  logger.error('FATAL ERROR', {
    error: { message: error.message, stack: error.stack },
  });
  setTimeout(() => process.exit(-1), 5000);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Makes a delay
 */
export const sleep = (delay: number) =>
  new Promise((resolve) => setTimeout(resolve, delay));

/**
 * Gets step for price
 */
export function getPriceStep(price: number): number {
  if (price < 1000) {
    return 50;
  }
  if (price >= 1000 && price < 10000) {
    return 100;
  }
  if (price >= 10000 && price < 50000) {
    return 250;
  }
  if (price >= 50000 && price < 100000) {
    return 500;
  }
  return 1000;
}

/**
 * Chunks array
 */
export function chunkArray<T>(sourceArray: T[], chunkSize: number): T[][] {
  const resultArray: T[][] = [];
  for (let i = 0; i < sourceArray.length; i += chunkSize) {
    const chunk = sourceArray.slice(i, i + chunkSize);

    resultArray.push(chunk);
  }
  return resultArray;
}

/**
 * get sleep interval depending on allowed work time
 */
export function calculateSleep({
  current,
  start,
  end,
}: {
  current: number;
  start: number;
  end: number;
}) {
  let pause = 0;

  if (end > start) {
    if (current < start) {
      pause = start - current;
    } else if (current > end) {
      pause = 24 - current + start;
    }
  } else if (end < start && current > end && current < start) {
    pause = start - current;
  }

  pause *= duration(1, 'hour').asMilliseconds();

  return pause;
}

export function roundUpToPriceStep(price: number) {
  const priceStep = getPriceStep(price);

  return Math.round(price / priceStep) * priceStep;
}

export function getMean(arr: number[]): number {
  const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length;
  return mean;
}

export function getStandartDeviation(arr: number[]): number {
  const mean = getMean(arr);
  return Math.sqrt(
    arr
      .reduce((acc, val) => acc.concat((val - mean) ** 2), [] as number[])
      .reduce((acc, val) => acc + val, 0) /
      (arr.length - 1)
  );
}

export function getExpireSbcTime(remainingTime: string[]): number {
  return 0;
}
