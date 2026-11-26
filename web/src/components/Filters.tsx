'use client';

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

  return (
    <div className="filters">
      {isAdmin && (
        <label className="field">
          <span>Компания</span>
          <select
            value={filters.companyId ?? ''}
            onChange={(e) => update({ companyId: e.target.value ? Number(e.target.value) : undefined, branchId: undefined })}
          >
            <option value="">Все компании</option>
            {companies.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {showBranch && (
        <label className="field">
          <span>Филиал</span>
          <select
            value={filters.branchId ?? ''}
            disabled={branches.loading && !branches.data}
            onChange={(e) => update({ branchId: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">Все филиалы</option>
            {branches.data?.items.map((b) => (
              <option key={b.id} value={b.id}>
                {isAdmin && !filters.companyId ? `${b.companyName} · ${b.name}` : b.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="field">
        <span>Период</span>
        <div className="segmented">
          {PRESETS.map((p) => (
            <button
              key={p.days}
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
