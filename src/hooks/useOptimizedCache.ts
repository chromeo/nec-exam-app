import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh data
}

/**
 * Optimized cache hook with TTL, LRU eviction, and stale-while-revalidate
 */
export function useOptimizedCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    maxSize = 100,
    staleWhileRevalidate = true
  } = options;

  const cache = useRef(new Map<string, CacheEntry<T>>());
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchPromiseRef = useRef<Promise<T> | null>(null);

  // LRU eviction
  const evictOldest = useCallback(() => {
    if (cache.current.size >= maxSize) {
      const oldestKey = cache.current.keys().next().value;
      if (oldestKey) {
        cache.current.delete(oldestKey);
      }
    }
  }, [maxSize]);

  // Check if cache entry is valid
  const isValid = useCallback((entry: CacheEntry<T>) => {
    return Date.now() < entry.expiry;
  }, []);

  // Fetch fresh data
  const fetchData = useCallback(async (forceRefresh = false) => {
    const cacheEntry = cache.current.get(key);
    
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && cacheEntry && isValid(cacheEntry)) {
      setData(cacheEntry.data);
      return cacheEntry.data;
    }

    // If stale-while-revalidate is enabled and we have stale data, return it immediately
    if (staleWhileRevalidate && cacheEntry && !forceRefresh) {
      setData(cacheEntry.data);
    } else {
      setLoading(true);
    }

    try {
      // Avoid duplicate fetches for the same key
      if (!fetchPromiseRef.current) {
        fetchPromiseRef.current = fetcher();
      }

      const freshData = await fetchPromiseRef.current;
      
      // Update cache
      evictOldest();
      cache.current.set(key, {
        data: freshData,
        timestamp: Date.now(),
        expiry: Date.now() + ttl
      });

      setData(freshData);
      setError(null);
      return freshData;
    } catch (err) {
      setError(err as Error);
      // If we have stale data, keep using it
      if (!cacheEntry) {
        setData(null);
      }
      throw err;
    } finally {
      setLoading(false);
      fetchPromiseRef.current = null;
    }
  }, [key, fetcher, ttl, isValid, evictOldest, staleWhileRevalidate]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Invalidate cache entry
  const invalidate = useCallback(() => {
    cache.current.delete(key);
    fetchData(true);
  }, [key, fetchData]);

  // Clear entire cache
  const clearCache = useCallback(() => {
    cache.current.clear();
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const entries = Array.from(cache.current.entries());
    const validEntries = entries.filter(([, entry]) => isValid(entry));
    const staleEntries = entries.filter(([, entry]) => !isValid(entry));

    return {
      totalEntries: entries.length,
      validEntries: validEntries.length,
      staleEntries: staleEntries.length,
      cacheHitRate: validEntries.length / entries.length || 0
    };
  }, [isValid]);

  return {
    data,
    loading,
    error,
    refetch: () => fetchData(true),
    invalidate,
    clearCache,
    getCacheStats
  };
}

/**
 * Hook for batching multiple API requests to reduce network overhead
 */
export function useBatchedRequests<T>(
  requests: Array<() => Promise<T>>,
  batchSize = 5,
  delay = 100
) {
  const [results, setResults] = useState<Array<T | Error>>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const executeBatch = useCallback(async () => {
    if (requests.length === 0) return;

    setLoading(true);
    setResults([]);
    setProgress(0);

    const allResults: Array<T | Error> = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      
      try {
        const batchResults = await Promise.allSettled(
          batch.map(request => request())
        );
        
        const processedResults = batchResults.map(result => 
          result.status === 'fulfilled' ? result.value : result.reason
        );
        
        allResults.push(...processedResults);
        setProgress((i + batch.length) / requests.length);
        
        // Small delay between batches to prevent overwhelming the server
        if (i + batchSize < requests.length) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        // Handle batch-level errors
        const errorResults = new Array(batch.length).fill(error);
        allResults.push(...errorResults);
      }
    }

    setResults(allResults);
    setLoading(false);
    setProgress(1);
  }, [requests, batchSize, delay]);

  return {
    results,
    loading,
    progress,
    execute: executeBatch
  };
}