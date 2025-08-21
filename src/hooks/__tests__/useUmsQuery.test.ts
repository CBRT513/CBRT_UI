import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useUmsQuery } from '../useUmsQuery';
import { UmsError } from '../../lib/ums';

describe('useUmsQuery', () => {
  it('should handle successful query', async () => {
    const mockData = { test: 'data' };
    const queryFn = vi.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() => useUmsQuery(queryFn));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBe(null);
    });
  });

  it('should handle query error', async () => {
    const error = new UmsError('Query failed', 500);
    const queryFn = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useUmsQuery(queryFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBe(null);
      expect(result.current.error).toEqual(error);
    });
  });

  it('should abort query on unmount', () => {
    const queryFn = vi.fn();
    const { unmount } = renderHook(() => useUmsQuery(queryFn));

    unmount();

    const signal = queryFn.mock.calls[0][0];
    expect(signal.aborted).toBe(true);
  });

  it('should not execute when disabled', () => {
    const queryFn = vi.fn();

    renderHook(() => useUmsQuery(queryFn, [], { enabled: false }));

    expect(queryFn).not.toHaveBeenCalled();
  });

  it('should refetch on demand', async () => {
    const queryFn = vi.fn().mockResolvedValue({ test: 'data' });

    const { result } = renderHook(() => useUmsQuery(queryFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(queryFn).toHaveBeenCalledTimes(1);

    result.current.refetch();

    await waitFor(() => {
      expect(queryFn).toHaveBeenCalledTimes(2);
    });
  });
});