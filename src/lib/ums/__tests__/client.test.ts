import { describe, it, expect, vi, beforeEach } from 'vitest';
import { umsRequest, UmsError } from '../client';

// Mock fetch
global.fetch = vi.fn();

describe('UMS Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  describe('umsRequest', () => {
    it('should make successful request', async () => {
      const mockData = { result: 'success' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await umsRequest('/api/test');
      
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle timeout', async () => {
      (global.fetch as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 20000))
      );

      const promise = umsRequest('/api/test', { timeout: 100 });
      
      vi.advanceTimersByTime(100);
      
      await expect(promise).rejects.toThrow(UmsError);
      await expect(promise).rejects.toMatchObject({
        status: 408,
        message: 'Request timeout',
      });
    });

    it('should retry on server error', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server error' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ result: 'success' }),
        });

      const result = await umsRequest('/api/test', { retries: 1, retryDelay: 10 });
      
      expect(result).toEqual({ result: 'success' });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw UmsError on failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found', detail: 'Resource missing' }),
      });

      await expect(umsRequest('/api/test')).rejects.toMatchObject({
        status: 404,
        message: 'Not found',
        detail: 'Resource missing',
      });
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(umsRequest('/api/test', { retries: 0 })).rejects.toThrow(UmsError);
    });
  });
});