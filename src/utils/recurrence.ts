import type { RecurrenceRule } from '../types';
import { DAY_NAMES } from '../types';

export function formatRecurrenceText(recurrence: RecurrenceRule): string {
  const unitText = recurrence.type === 'day' ? '天' : recurrence.type === 'week' ? '周' : '月';

  if (recurrence.type === 'week' && recurrence.daysOfWeek?.length) {
    const daysText = recurrence.daysOfWeek.map((day) => DAY_NAMES[day]).join('、');
    return `每${recurrence.interval}${unitText} ${daysText}重复`;
  }

  if (recurrence.type === 'month' && recurrence.daysOfMonth?.length) {
    const daysText = recurrence.daysOfMonth.map((day) => `${day}号`).join('、');
    return `每${recurrence.interval}月 ${daysText}重复`;
  }

  return `每${recurrence.interval}${unitText}重复`;
}
