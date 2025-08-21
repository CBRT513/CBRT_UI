/**
 * Performance Optimization for 100+ Concurrent Users
 */

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  concurrentUsers: number;
  cpuUsage: number;
  memoryUsage: number;
  cacheHitRate: number;
  queueLength: number;
  errorRate: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccess: number;
}

export interface ConnectionPoolConfig {
  minConnections: number;
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  maxWaitQueue: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (userId: string) => string;
}

export interface BatchConfig {
  maxBatchSize: number;
  maxWaitTime: number;
  processInterval: number;
}

/**
 * High-performance cache with LRU eviction
 */
export class PerformanceCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private accessOrder: string[] = [];
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 10000, defaultTTL: number = 60000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get item from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }

    // Update access tracking
    entry.hits++;
    entry.lastAccess = Date.now();
    this.updateAccessOrder(key);

    return entry.data;
  }

  /**
   * Set item in cache
   */
  set(key: string, data: T, ttl?: number): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hits: 0,
      lastAccess: Date.now(),
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  /**
   * Batch get multiple items
   */
  getMany(keys: string[]): Map<string, T> {
    const results = new Map<string, T>();
    
    for (const key of keys) {
      const value = this.get(key);
      if (value !== null) {
        results.set(key, value);
      }
    }

    return results;
  }

  /**
   * Batch set multiple items
   */
  setMany(entries: Array<[string, T]>, ttl?: number): void {
    for (const [key, value] of entries) {
      this.set(key, value, ttl);
    }
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hitRate: number;
    avgHits: number;
    memoryUsage: number;
  } {
    let totalHits = 0;
    let accessedEntries = 0;

    for (const entry of this.cache.values()) {
      if (entry.hits > 0) {
        totalHits += entry.hits;
        accessedEntries++;
      }
    }

    return {
      size: this.cache.size,
      hitRate: accessedEntries / Math.max(1, this.cache.size),
      avgHits: accessedEntries > 0 ? totalHits / accessedEntries : 0,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  private evictLRU(): void {
    if (this.accessOrder.length > 0) {
      const lru = this.accessOrder[0];
      this.cache.delete(lru);
      this.accessOrder.shift();
    }
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage in bytes
    return this.cache.size * 1024; // Assume 1KB average per entry
  }
}

/**
 * Connection pool for database/API connections
 */
export class ConnectionPool {
  private connections: Array<{ id: string; inUse: boolean; lastUsed: number }> = [];
  private waitQueue: Array<(conn: any) => void> = [];
  private config: ConnectionPoolConfig;

  constructor(config: ConnectionPoolConfig) {
    this.config = config;
    this.initialize();
  }

  private initialize(): void {
    // Create minimum connections
    for (let i = 0; i < this.config.minConnections; i++) {
      this.connections.push({
        id: `conn_${i}`,
        inUse: false,
        lastUsed: Date.now(),
      });
    }

    // Start idle connection cleanup
    setInterval(() => this.cleanupIdleConnections(), 30000);
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<any> {
    // Find available connection
    const available = this.connections.find(c => !c.inUse);
    
    if (available) {
      available.inUse = true;
      available.lastUsed = Date.now();
      return available;
    }

    // Create new connection if under max
    if (this.connections.length < this.config.maxConnections) {
      const newConn = {
        id: `conn_${this.connections.length}`,
        inUse: true,
        lastUsed: Date.now(),
      };
      this.connections.push(newConn);
      return newConn;
    }

    // Wait for available connection
    if (this.waitQueue.length < this.config.maxWaitQueue) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const index = this.waitQueue.indexOf(resolve);
          if (index > -1) {
            this.waitQueue.splice(index, 1);
          }
          reject(new Error('Connection timeout'));
        }, this.config.connectionTimeout);

        const wrappedResolve = (conn: any) => {
          clearTimeout(timeout);
          resolve(conn);
        };

        this.waitQueue.push(wrappedResolve);
      });
    }

    throw new Error('Connection pool exhausted');
  }

  /**
   * Release connection back to pool
   */
  release(connection: any): void {
    const conn = this.connections.find(c => c.id === connection.id);
    if (conn) {
      conn.inUse = false;
      conn.lastUsed = Date.now();

      // Process wait queue
      if (this.waitQueue.length > 0) {
        const waiter = this.waitQueue.shift();
        if (waiter) {
          conn.inUse = true;
          waiter(conn);
        }
      }
    }
  }

  /**
   * Clean up idle connections
   */
  private cleanupIdleConnections(): void {
    const now = Date.now();
    const minConnections = this.config.minConnections;

    this.connections = this.connections.filter((conn, index) => {
      if (index < minConnections) return true; // Keep minimum connections
      if (conn.inUse) return true; // Keep in-use connections
      
      return now - conn.lastUsed < this.config.idleTimeout;
    });
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    total: number;
    active: number;
    idle: number;
    waiting: number;
  } {
    const active = this.connections.filter(c => c.inUse).length;
    
    return {
      total: this.connections.length,
      active,
      idle: this.connections.length - active,
      waiting: this.waitQueue.length,
    };
  }
}

/**
 * Rate limiter for API endpoints
 */
export class RateLimiter {
  private windows: Map<string, { count: number; resetTime: number }> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;

    // Cleanup old windows periodically
    setInterval(() => this.cleanup(), config.windowMs);
  }

  /**
   * Check if request is allowed
   */
  async checkLimit(userId: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = this.config.keyGenerator ? this.config.keyGenerator(userId) : userId;
    const now = Date.now();
    
    let window = this.windows.get(key);

    // Create or reset window
    if (!window || now >= window.resetTime) {
      window = {
        count: 0,
        resetTime: now + this.config.windowMs,
      };
      this.windows.set(key, window);
    }

    const allowed = window.count < this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - window.count - 1);

    if (allowed) {
      window.count++;
    }

    return {
      allowed,
      remaining,
      resetTime: window.resetTime,
    };
  }

  /**
   * Clean up expired windows
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, window] of this.windows.entries()) {
      if (now >= window.resetTime) {
        this.windows.delete(key);
      }
    }
  }

  /**
   * Reset limits for a user
   */
  reset(userId: string): void {
    const key = this.config.keyGenerator ? this.config.keyGenerator(userId) : userId;
    this.windows.delete(key);
  }
}

/**
 * Request batcher for reducing database/API calls
 */
export class RequestBatcher<T, R> {
  private batch: Map<string, { request: T; callbacks: Array<(result: R) => void> }> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private config: BatchConfig;
  private processor: (requests: T[]) => Promise<R[]>;

  constructor(
    config: BatchConfig,
    processor: (requests: T[]) => Promise<R[]>
  ) {
    this.config = config;
    this.processor = processor;
  }

  /**
   * Add request to batch
   */
  async add(key: string, request: T): Promise<R> {
    return new Promise((resolve) => {
      const existing = this.batch.get(key);
      
      if (existing) {
        existing.callbacks.push(resolve);
      } else {
        this.batch.set(key, {
          request,
          callbacks: [resolve],
        });
      }

      // Schedule processing
      if (this.batch.size >= this.config.maxBatchSize) {
        this.processBatch();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.processBatch(), this.config.maxWaitTime);
      }
    });
  }

  /**
   * Process the current batch
   */
  private async processBatch(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.batch.size === 0) return;

    const currentBatch = new Map(this.batch);
    this.batch.clear();

    try {
      const requests = Array.from(currentBatch.values()).map(b => b.request);
      const results = await this.processor(requests);

      // Distribute results to callbacks
      let index = 0;
      for (const [, { callbacks }] of currentBatch) {
        const result = results[index++];
        callbacks.forEach(callback => callback(result));
      }
    } catch (error) {
      // Error handling - reject all callbacks
      for (const [, { callbacks }] of currentBatch) {
        callbacks.forEach(callback => callback(null as any));
      }
    }
  }
}

/**
 * Performance monitoring service
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    responseTime: 0,
    throughput: 0,
    concurrentUsers: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    queueLength: 0,
    errorRate: 0,
  };

  private samples: Array<{ timestamp: number; metrics: PerformanceMetrics }> = [];
  private maxSamples = 1000;

  /**
   * Record a metric sample
   */
  record(metrics: Partial<PerformanceMetrics>): void {
    this.metrics = { ...this.metrics, ...metrics };
    
    this.samples.push({
      timestamp: Date.now(),
      metrics: { ...this.metrics },
    });

    // Keep samples under limit
    if (this.samples.length > this.maxSamples) {
      this.samples = this.samples.slice(-this.maxSamples / 2);
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get metrics over time period
   */
  getMetricsOverTime(periodMs: number): PerformanceMetrics[] {
    const cutoff = Date.now() - periodMs;
    return this.samples
      .filter(s => s.timestamp >= cutoff)
      .map(s => s.metrics);
  }

  /**
   * Get average metrics
   */
  getAverageMetrics(periodMs?: number): PerformanceMetrics {
    const samples = periodMs 
      ? this.getMetricsOverTime(periodMs)
      : this.samples.map(s => s.metrics);

    if (samples.length === 0) {
      return this.metrics;
    }

    const avg: PerformanceMetrics = {
      responseTime: 0,
      throughput: 0,
      concurrentUsers: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      queueLength: 0,
      errorRate: 0,
    };

    for (const sample of samples) {
      avg.responseTime += sample.responseTime;
      avg.throughput += sample.throughput;
      avg.concurrentUsers += sample.concurrentUsers;
      avg.cpuUsage += sample.cpuUsage;
      avg.memoryUsage += sample.memoryUsage;
      avg.cacheHitRate += sample.cacheHitRate;
      avg.queueLength += sample.queueLength;
      avg.errorRate += sample.errorRate;
    }

    const count = samples.length;
    return {
      responseTime: avg.responseTime / count,
      throughput: avg.throughput / count,
      concurrentUsers: avg.concurrentUsers / count,
      cpuUsage: avg.cpuUsage / count,
      memoryUsage: avg.memoryUsage / count,
      cacheHitRate: avg.cacheHitRate / count,
      queueLength: avg.queueLength / count,
      errorRate: avg.errorRate / count,
    };
  }

  /**
   * Check if performance is degraded
   */
  isPerformanceDegraded(): boolean {
    const avg = this.getAverageMetrics(60000); // Last minute
    
    return (
      avg.responseTime > 500 || // >500ms response time
      avg.errorRate > 0.05 || // >5% error rate
      avg.cpuUsage > 0.8 || // >80% CPU
      avg.memoryUsage > 0.9 || // >90% memory
      avg.queueLength > 100 // >100 queued requests
    );
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const current = this.metrics;

    if (current.responseTime > 500) {
      recommendations.push('High response time detected - consider scaling horizontally');
    }

    if (current.cacheHitRate < 0.7) {
      recommendations.push('Low cache hit rate - review cache keys and TTL settings');
    }

    if (current.cpuUsage > 0.8) {
      recommendations.push('High CPU usage - optimize algorithms or add more cores');
    }

    if (current.memoryUsage > 0.9) {
      recommendations.push('High memory usage - check for memory leaks or increase RAM');
    }

    if (current.queueLength > 50) {
      recommendations.push('Large queue backlog - increase worker threads or processing capacity');
    }

    if (current.errorRate > 0.05) {
      recommendations.push('High error rate - investigate failure patterns');
    }

    return recommendations;
  }
}

/**
 * Query optimizer for database operations
 */
export class QueryOptimizer {
  private queryCache = new PerformanceCache<any>(5000, 30000);
  private queryStats = new Map<string, { count: number; avgTime: number }>();

  /**
   * Optimize and execute query
   */
  async execute<T>(
    query: string,
    params: any[],
    executor: (q: string, p: any[]) => Promise<T>
  ): Promise<T> {
    const cacheKey = this.getCacheKey(query, params);
    
    // Check cache
    const cached = this.queryCache.get(cacheKey);
    if (cached !== null) {
      this.updateStats(query, 0); // Cache hit
      return cached;
    }

    // Execute query
    const startTime = Date.now();
    const result = await executor(query, params);
    const executionTime = Date.now() - startTime;

    // Update stats
    this.updateStats(query, executionTime);

    // Cache if query is frequently used
    const stats = this.queryStats.get(query);
    if (stats && stats.count > 10 && executionTime > 50) {
      this.queryCache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Batch execute multiple queries
   */
  async executeBatch<T>(
    queries: Array<{ query: string; params: any[] }>,
    executor: (queries: Array<{ query: string; params: any[] }>) => Promise<T[]>
  ): Promise<T[]> {
    // Group similar queries
    const grouped = this.groupSimilarQueries(queries);
    const results: T[] = new Array(queries.length);

    for (const group of grouped) {
      if (group.length === 1) {
        // Single query
        results[group[0].index] = await this.execute(
          group[0].query,
          group[0].params,
          async (q, p) => {
            const res = await executor([{ query: q, params: p }]);
            return res[0];
          }
        );
      } else {
        // Batch similar queries
        const batchResults = await executor(group.map(g => ({ 
          query: g.query, 
          params: g.params 
        })));
        
        group.forEach((g, i) => {
          results[g.index] = batchResults[i];
        });
      }
    }

    return results;
  }

  private getCacheKey(query: string, params: any[]): string {
    return `${query}_${JSON.stringify(params)}`;
  }

  private updateStats(query: string, executionTime: number): void {
    const stats = this.queryStats.get(query) || { count: 0, avgTime: 0 };
    
    stats.avgTime = (stats.avgTime * stats.count + executionTime) / (stats.count + 1);
    stats.count++;
    
    this.queryStats.set(query, stats);
  }

  private groupSimilarQueries(
    queries: Array<{ query: string; params: any[] }>
  ): Array<Array<{ query: string; params: any[]; index: number }>> {
    const groups: Map<string, Array<{ query: string; params: any[]; index: number }>> = new Map();

    queries.forEach((q, index) => {
      const template = q.query.replace(/\?/g, '?'); // Normalize query template
      const group = groups.get(template) || [];
      group.push({ ...q, index });
      groups.set(template, group);
    });

    return Array.from(groups.values());
  }

  /**
   * Get optimization suggestions
   */
  getSuggestions(): Array<{ query: string; suggestion: string }> {
    const suggestions: Array<{ query: string; suggestion: string }> = [];

    for (const [query, stats] of this.queryStats) {
      if (stats.avgTime > 100) {
        suggestions.push({
          query,
          suggestion: `Slow query (avg ${stats.avgTime}ms) - consider adding indexes`,
        });
      }

      if (stats.count > 100 && this.queryCache.get(query) === null) {
        suggestions.push({
          query,
          suggestion: `Frequently used query (${stats.count} calls) - consider caching`,
        });
      }
    }

    return suggestions;
  }
}

// Singleton instances
export const performanceCache = new PerformanceCache();
export const performanceMonitor = new PerformanceMonitor();
export const queryOptimizer = new QueryOptimizer();