import { BadRequestException } from '@nestjs/common';

export interface Period {
  from: string;
  to: string;
  days: number;
}

const DAY = 86_400_000;
const MAX_DAYS = 366;

const toIso = (d: Date) => d.toISOString().slice(0, 10);

/** По умолчанию последние 30 дней включая сегодня */
export function resolvePeriod(from?: string, to?: string): Period {
  const end = to ? new Date(`${to.slice(0, 10)}T00:00:00Z`) : new Date(new Date().toISOString().slice(0, 10));
  const start = from ? new Date(`${from.slice(0, 10)}T00:00:00Z`) : new Date(end.getTime() - 29 * DAY);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new BadRequestException('Некорректный период');
  }
  if (start > end) throw new BadRequestException('Дата начала позже даты окончания');

  const days = Math.round((end.getTime() - start.getTime()) / DAY) + 1;
  if (days > MAX_DAYS) throw new BadRequestException(`Период не может быть длиннее ${MAX_DAYS} дней`);

  return { from: toIso(start), to: toIso(end), days };
}

/** Такой же по длине период прямо перед текущим, для сравнения "было/стало" */
export function previousPeriod(period: Period): Period {
  const start = new Date(`${period.from}T00:00:00Z`);
  return {
    from: toIso(new Date(start.getTime() - period.days * DAY)),
    to: toIso(new Date(start.getTime() - DAY)),
    days: period.days,
  };
}
