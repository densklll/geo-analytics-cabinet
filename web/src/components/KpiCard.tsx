import { percentChange } from '@/lib/format';

interface Props {
  title: string;
  value: string;
  current: number | null;
  previous: number | null;
  hint?: string;
}

export function KpiCard({ title, value, current, previous, hint }: Props) {
  const change = current !== null && previous !== null ? percentChange(current, previous) : null;
  return (
    <div className="card kpi">
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot">
        {change === null ? (
          <span className="muted">{hint ?? 'нет данных для сравнения'}</span>
        ) : (
          <span className={change >= 0 ? 'up' : 'down'}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1).replace('.', ',')}% к прошлому периоду
          </span>
        )}
      </div>
    </div>
  );
}
