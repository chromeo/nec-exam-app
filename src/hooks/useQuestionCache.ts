import { useState, useCallback, useMemo } from 'react';
import type { Question, QuestionFilters } from '../supabase/functions/server/types';

interface CacheEntry {
  data: Question[];
  filteredData: Question[];
  filterKey: string;
  timestamp: number;
}

interface UseQuestionCacheOptions {
  cacheTimeout?: number; // Cache timeout in milliseconds (default: 5 minutes)
}

export const useQuestionCache = (options: UseQuestionCacheOptions = {}) => {
  const { cacheTimeout = 5 * 60 * 1000 } = options; // 5 minutes default
  
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map());
  const [rawQuestions, setRawQuestions] = useState<Question[]>([]);

  // Generate a unique key for filter combination
  const generateFilterKey = useCallback((filters: QuestionFilters): string => {
    return JSON.stringify({
      searchTerm: filters.searchTerm || '',
      category: filters.category || 'All',
      difficulty: filters.difficulty || 'All',
      dateFrom: filters.dateFrom || '',
      dateTo: filters.dateTo || '',
      hasReference: filters.hasReference,
      status: filters.status || 'All'
    });
  }, []);

  // Check if cache entry is valid (not expired)
  const isCacheValid = useCallback((entry: CacheEntry): boolean => {
    return Date.now() - entry.timestamp < cacheTimeout;
  }, [cacheTimeout]);

  // Apply filters to questions
  const applyFilters = useCallback((questions: Question[], filters: QuestionFilters): Question[] => {
    let filtered = [...questions];

    // Text search
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.question.toLowerCase().includes(searchLower) ||
          q.options.some((option) => option.toLowerCase().includes(searchLower)) ||
          (q.reference && q.reference.toLowerCase().includes(searchLower))
      );
    }

    // Category filter
    if (filters.category !== "All") {
      filtered = filtered.filter((q) => q.category === filters.category);
    }

    // Difficulty filter
    if (filters.difficulty !== "All") {
      filtered = filtered.filter((q) => q.difficulty === filters.difficulty);
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter((q) => new Date(q.createdAt) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter((q) => new Date(q.createdAt) <= toDate);
    }

    // Reference filter
    if (filters.hasReference !== null) {
      if (filters.hasReference) {
        filtered = filtered.filter((q) => q.reference && q.reference.trim() !== "");
      } else {
        filtered = filtered.filter((q) => !q.reference || q.reference.trim() === "");
      }
    }

    // Status filter
    if (filters.status !== "All") {
      filtered = filtered.filter((q) => q.status === filters.status);
    }

    return filtered;
  }, []);

  // Get filtered questions with caching
  const getFilteredQuestions = useCallback((
    questions: Question[], 
    filters: QuestionFilters,
    sortConfig: { key: keyof Question; direction: 'asc' | 'desc' } | null
  ): Question[] => {
    const filterKey = generateFilterKey(filters);
    const cacheKey = `${filterKey}_${JSON.stringify(sortConfig)}`;
    
    // Check if we have a valid cache entry
    const cachedEntry = cache.get(cacheKey);
    if (cachedEntry && isCacheValid(cachedEntry) && 
        JSON.stringify(cachedEntry.data) === JSON.stringify(questions)) {
      return cachedEntry.filteredData;
    }

    // Apply filters
    let filtered = applyFilters(questions, filters);

    // Apply sorting
    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        let comparison = 0;
        if (aValue < bValue) {
          comparison = -1;
        } else if (aValue > bValue) {
          comparison = 1;
        }
        
        return sortConfig.direction === 'desc' ? comparison * -1 : comparison;
      });
    }

    // Cache the result
    const newCacheEntry: CacheEntry = {
      data: [...questions],
      filteredData: filtered,
      filterKey,
      timestamp: Date.now()
    };

    setCache(prev => new Map(prev.set(cacheKey, newCacheEntry)));

    return filtered;
  }, [cache, generateFilterKey, isCacheValid, applyFilters]);

  // Update raw questions and invalidate related cache
  const updateQuestions = useCallback((newQuestions: Question[]) => {
    setRawQuestions(newQuestions);
    
    // Clear all cache entries since raw data changed
    setCache(new Map());
  }, []);

  // Optimistically update a single question in cache
  const updateQuestionInCache = useCallback((updatedQuestion: Question) => {
    setRawQuestions(prev => {
      const updated = prev.map(q => q.id === updatedQuestion.id ? updatedQuestion : q);
      return updated;
    });

    // Update cache entries that contain this question
    setCache(prev => {
      const newCache = new Map();
      
      prev.forEach((entry, key) => {
        const updatedData = entry.data.map(q => q.id === updatedQuestion.id ? updatedQuestion : q);
        const updatedFiltered = entry.filteredData.map(q => q.id === updatedQuestion.id ? updatedQuestion : q);
        
        newCache.set(key, {
          ...entry,
          data: updatedData,
          filteredData: updatedFiltered
        });
      });
      
      return newCache;
    });
  }, []);

  // Add a new question to cache
  const addQuestionToCache = useCallback((newQuestion: Question) => {
    setRawQuestions(prev => [...prev, newQuestion]);

    // Update cache entries by adding the new question
    setCache(prev => {
      const newCache = new Map();
      
      prev.forEach((entry, key) => {
        const updatedData = [...entry.data, newQuestion];
        
        // Re-apply filters to determine if this question should be in filtered results
        const filters = JSON.parse(entry.filterKey) as QuestionFilters;
        const updatedFiltered = applyFilters(updatedData, filters);
        
        newCache.set(key, {
          ...entry,
          data: updatedData,
          filteredData: updatedFiltered
        });
      });
      
      return newCache;
    });
  }, [applyFilters]);

  // Remove a question from cache
  const removeQuestionFromCache = useCallback((questionId: string) => {
    setRawQuestions(prev => prev.filter(q => q.id !== questionId));

    // Update cache entries by removing the question
    setCache(prev => {
      const newCache = new Map();
      
      prev.forEach((entry, key) => {
        const updatedData = entry.data.filter(q => q.id !== questionId);
        const updatedFiltered = entry.filteredData.filter(q => q.id !== questionId);
        
        newCache.set(key, {
          ...entry,
          data: updatedData,
          filteredData: updatedFiltered
        });
      });
      
      return newCache;
    });
  }, []);

  // Clear cache when filters change or manual refresh needed
  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  // Get cache statistics for debugging
  const getCacheStats = useCallback(() => {
    const now = Date.now();
    const entries = Array.from(cache.entries());
    
    return {
      totalEntries: entries.length,
      validEntries: entries.filter(([, entry]) => isCacheValid(entry)).length,
      expiredEntries: entries.filter(([, entry]) => !isCacheValid(entry)).length,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(([, entry]) => entry.timestamp)) : null,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(([, entry]) => entry.timestamp)) : null,
      cacheSize: entries.length
    };
  }, [cache, isCacheValid]);

  return {
    rawQuestions,
    getFilteredQuestions,
    updateQuestions,
    updateQuestionInCache,
    addQuestionToCache,
    removeQuestionFromCache,
    clearCache,
    getCacheStats
  };
};