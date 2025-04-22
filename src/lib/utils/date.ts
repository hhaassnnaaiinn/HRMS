import { DateTime } from 'luxon';

export function getSystemTimezone(): string {
  return localStorage.getItem('systemTimezone') || 'UTC';
}

export function formatToSystemTime(isoString: string): string {
  return DateTime.fromISO(isoString)
    .setZone(getSystemTimezone())
    .toFormat('HH:mm');
}

export function formatToSystemDateTime(isoString: string): string {
  return DateTime.fromISO(isoString)
    .setZone(getSystemTimezone())
    .toFormat('yyyy-MM-dd HH:mm:ss');
}

export function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let days = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}