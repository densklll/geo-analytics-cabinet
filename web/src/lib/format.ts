const number = new Intl.NumberFormat('ru-RU');

export const formatNumber = (value: number) => number.format(value);

export const formatRating = (value: number | null) => (value === null ? '—' : value.toFixed(2).replace('.', ','));

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function shortDate(iso: string) {
  const [, month, day] = iso.split('-');
  return `${day}.${month}`;
}

/** Изменение к прошлому периоду в процентах, null если сравнивать не с чем */
export function percentChange(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

export function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toIso(d);
}

export function toIso(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
