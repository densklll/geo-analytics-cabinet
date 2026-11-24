'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from './api';

interface State<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

/**
 * Загружает данные, когда меняется key (обычно это строка с фильтрами).
 * Ответы устаревших запросов отбрасываются, чтобы быстрые переключения
 * фильтров не показывали данные от предыдущего выбора.
 */
export function useApi<T>(key: string | null, fetcher: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: key !== null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => !cancelled && setState((s) => ({ ...s, error, loading: false })));
    return () => {
      cancelled = true;
    };
    // fetcher специально не в зависимостях: он пересоздается каждый рендер, а key описывает запрос полностью
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload, setData: (data: T) => setState((s) => ({ ...s, data })) };
}
