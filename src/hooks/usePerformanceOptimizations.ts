import { useEffect, useRef, useCallback, useMemo, useState } from 'react';

/**
 * Custom hook for performance optimizations and monitoring
 */
export function usePerformanceOptimizations() {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());

  // Track render performance
  useEffect(() => {
    renderCount.current += 1;
    const currentTime = performance.now();
    const timeSinceLastRender = currentTime - lastRenderTime.current;
    lastRenderTime.current = currentTime;

    // Log slow renders in development
    if (process.env.NODE_ENV === 'development' && timeSinceLastRender > 16) {
      console.warn(`Slow render detected: ${timeSinceLastRender.toFixed(2)}ms`);
    }
  });

  return {
    renderCount: renderCount.current,
  };
}

/**
 * Debounce hook for expensive operations
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Memoized callback that only changes when dependencies change
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps);
}

/**
 * Throttle hook for frequent operations like scrolling
 */
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

/**
 * Hook for optimizing expensive computations
 */
export function useExpensiveComputation<T>(
  computeFunction: () => T,
  deps: React.DependencyList
): T {
  return useMemo(() => {
    const startTime = performance.now();
    const result = computeFunction();
    const endTime = performance.now();
    
    if (process.env.NODE_ENV === 'development' && endTime - startTime > 5) {
      console.warn(`Expensive computation took ${(endTime - startTime).toFixed(2)}ms`);
    }
    
    return result;
  }, deps);
}

/**
 * Hook for managing component visibility and intersection observer
 */
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      options
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, options]);

  return isIntersecting;
}