'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatNumber, shortDate } from '@/lib/format';

export function MetricChart({ points, label }: { points: { date: string; value: number }[]; label: string }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={points} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#eef0f4" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 12, fill: '#6b7280' }} minTickGap={24} />
        <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} width={48} tickFormatter={(v) => formatNumber(v)} />
        <Tooltip
          labelFormatter={(d) => shortDate(String(d))}
          formatter={(v) => [formatNumber(Number(v)), label]}
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
