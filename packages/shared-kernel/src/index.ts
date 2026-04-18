import { createHash, randomInt } from 'crypto';

export const hashValue = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

export const generateOtp = (): string => `${randomInt(100000, 999999)}`;

export const nowPlusMinutes = (minutes: number): Date => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  return now;
};
