import { useState, useEffect, useRef, useCallback } from 'react';
import { UmsError } from '../lib/ums';

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: UmsError | null;
}

interface UseUmsQueryOptions {
  enabled?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: UmsError) => void;
}

export function useUmsQuery<T>(
  queryFn: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList = [],
  options: UseUmsQueryOptions = {}
): QueryState<T> & { refetch: () => void } {
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const { enabled = true, onSuccess, onError } = options;

  const execute = useCallback(async () => {
    if (!enabled) return;

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new controller
    abortControllerRef.current = new AbortController();

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await queryFn(abortControllerRef.current.signal);
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setState({ data: result, loading: false, error: null });
      onSuccess?.(result);
    } catch (error) {
      // Ignore aborted requests
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      const umsError = error instanceof UmsError 
        ? error 
        : new UmsError('Query failed', 500);

      setState({ data: null, loading: false, error: umsError });
      onError?.(umsError);
    }
  }, [queryFn, enabled, onSuccess, onError, ...deps]);

  useEffect(() => {
    execute();

    return () => {
      // Cleanup: abort request on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [execute]);

  return {
    ...state,
    refetch: execute,
  };
}

// Specialized hook for paginated queries
export function useUmsPaginatedQuery<T>(
  queryFn: (page: number, limit: number, signal: AbortSignal) => Promise<T[]>,
  options: UseUmsQueryOptions & { limit?: number } = {}
): {
  items: T[];
  loading: boolean;
  error: UmsError | null;
  page: number;
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
} {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { limit = 10, ...queryOptions } = options;

  const { data, loading, error, refetch } = useUmsQuery(
    (signal) => queryFn(page, limit, signal),
    [page, limit],
    queryOptions
  );

  useEffect(() => {
    if (data) {
      if (page === 0) {
        setItems(data);
      } else {
        setItems((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === limit);
    }
  }, [data, page, limit]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage((p) => p + 1);
    }
  }, [loading, hasMore]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(0);
    setHasMore(true);
  }, []);

  return {
    items,
    loading,
    error,
    page,
    hasMore,
    loadMore,
    reset,
  };
}