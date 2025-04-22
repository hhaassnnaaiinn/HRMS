import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DateTime } from 'luxon';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSystemTimezone() {
  return localStorage.getItem('systemTimezone') || 'UTC';
}

export function formatToSystemTime(isoString: string) {
  return DateTime.fromISO(isoString)
    .setZone(getSystemTimezone())
    .toFormat('HH:mm');
}

export function formatToSystemDateTime(isoString: string) {
  return DateTime.fromISO(isoString)
    .setZone(getSystemTimezone())
    .toFormat('yyyy-MM-dd HH:mm:ss');
}