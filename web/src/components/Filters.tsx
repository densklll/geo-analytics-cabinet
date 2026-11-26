'use client';

import { Select } from '@/components/Select';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFilters } from '@/lib/filters';
import { isoDaysAgo, toIso } from '@/lib/format';
import { BranchesResponse, Company } from '@/lib/types';
import { useApi } from '@/lib/useApi';

const PRESETS = [
  { label: '7 дней', days: 7 },
  { label: '30 дней', days: 30 },
  { label: '90 дней', days: 90 },
];

export function Filters({ showBranch = true }: { showBranch?: boolean }) {
  const { user } = useAuth();
  const { filters, update } = useFilters();
  const isAdmin = user?.role === 'admin';

  const companies = useApi(isAdmin ? 'companies' : null, () => api<Company[]>('/companies'));
  // список филиалов для селекта берем с бэка, поэтому клиент физически не увидит чужие
  const branches = useApi(showBranch ? `branches-options:${filters.companyId ?? ''}` : null, () =>
    api<BranchesResponse>('/branches', { query: { companyId: filters.companyId } }),
  );

  const today = toIso(new Date());
  const activePreset = PRESETS.find((p) => filters.to === today && filters.from === isoDaysAgo(p.days - 1));

  const companyOptions = [
    { value: '', label: 'Все компании' },
    ...(companies.data?.map((c) => ({ value: String(c.id), label: c.name })) ?? []),
  ];

  const branchOptions = [
    { value: '', label: 'Все филиалы' },
    ...(branches.data?.items.map((b) => ({
      value: String(b.id),
      label: isAdmin && !filters.companyId ? `${b.companyName} · ${b.name}` : b.name,
    })) ?? []),
  ];

  return (
    <div className="filters">
      {isAdmin && (
        <div className="field">
          <span>Компания</span>
          <Select
            value={filters.companyId ? String(filters.companyId) : ''}
            options={companyOptions}
            onChange={(v) => update({ companyId: v ? Number(v) : undefined, branchId: undefined })}
          />
        </div>
      )}

      {showBranch && (
        <div className="field">
          <span>Филиал</span>
          <Select
            value={filters.branchId ? String(filters.branchId) : ''}
            options={branchOptions}
            disabled={branches.loading && !branches.data}
            onChange={(v) => update({ branchId: v ? Number(v) : undefined })}
          />
        </div>
      )}

      <div className="field">
        <span>Период</span>
        <div className="segmented">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              type="button"
              className={activePreset === p ? 'active' : ''}
              onClick={() => update({ from: isoDaysAgo(p.days - 1), to: today })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>С</span>
        <input type="date" value={filters.from} max={filters.to} onChange={(e) => e.target.value && update({ from: e.target.value })} />
      </label>
      <label className="field">
        <span>По</span>
        <input type="date" value={filters.to} min={filters.from} onChange={(e) => e.target.value && update({ to: e.target.value })} />
      </label>
    </div>
  );
}
