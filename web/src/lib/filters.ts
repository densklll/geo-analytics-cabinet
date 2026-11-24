'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { isoDaysAgo, toIso } from './format';

export interface Filters {
  companyId?: number;
  branchId?: number;
  from: string;
  to: string;
}

const num = (value: string | null) => (value ? Number(value) : undefined);

/**
 * Фильтры живут в URL: ссылку на конкретный срез можно отправить коллеге,
 * а при переходе между страницами выбор сохраняется.
 */
export function useFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: Filters = useMemo(
    () => ({
      companyId: num(params.get('companyId')),
      branchId: num(params.get('branchId')),
      from: params.get('from') ?? isoDaysAgo(29),
      to: params.get('to') ?? toIso(new Date()),
    }),
    [params],
  );

  const update = useCallback(
    (patch: Partial<Filters>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === '') next.delete(key);
        else next.set(key, String(value));
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  return { filters, update, queryString: params.toString() };
}
