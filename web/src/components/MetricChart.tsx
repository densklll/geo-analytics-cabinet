'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDate, formatNumber, shortDate } from '@/lib/format';

export function MetricChart({ points, label }: { points: { date: string; value: number }[]; label: string }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={points} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="metricFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 12, fill: '#64748b' }} minTickGap={24} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} width={52} tickFormatter={(v) => formatNumber(v)} axisLine={false} tickLine={false} />
        <Tooltip
          labelFormatter={(d) => formatDate(`${String(d)}T00:00:00`)}
          formatter={(v) => [formatNumber(Number(v)), label]}
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)' }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#2563eb"
          strokeWidth={2}
          fill="url(#metricFill)"
          dot={false}
          activeDot={{ r: 4, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
