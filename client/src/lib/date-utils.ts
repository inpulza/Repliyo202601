import { formatDistanceToNow } from 'date-fns';

export function formatTimeAgo(date: Date | string | number): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return formatDistanceToNow(dateObj, { addSuffix: false }).replace('about ', '');
}

export function formatTimeAgoWithSuffix(date: Date | string | number): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return formatDistanceToNow(dateObj, { addSuffix: true }).replace('about ', '');
}
