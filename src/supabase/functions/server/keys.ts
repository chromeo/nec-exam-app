/**
 * Standard ID generation - ALL entities should use this
 * Format: timestamp-randomsuffix
 * Example: "1756691891290-e6p5rn0aa"
 * 
 * Benefits:
 * - Chronologically sortable (timestamp first)
 * - Unique (timestamp + random suffix)
 * - Shorter than UUIDs (23 chars vs 36)
 * - Easy to debug (can see when created)
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
/**
 * Key generation functions - centralized to prevent inconsistencies
 * All keys follow pattern: prefix:id
 */
export const Keys = {
  // Questions
  question: (questionId: string) => `question:${questionId}`,
  // Templates - SHORTENED PREFIX (was "exam-template")
  template: (templateId: string) => `template:${templateId}`,
  // Sessions - SHORTENED PREFIX (was "exam-session")
  session: (sessionId: string) => `session:${sessionId}`,
  // Results - SHORTENED PREFIX (was "exam-result")
  result: (resultId: string) => `result:${resultId}`,

  // Question Categories (only category type we use)
  // Note: We don't use separate "exam categories" - exam organization is done via templates
  questionCategory: (categoryId: string) => `question-category:${categoryId}`,

  // Comments
  comment: (commentId: string) => `comment:${commentId}`,

  // Index keys for comments (for efficient querying)
  commentsByExam: (examId: string, commentId: string) =>
    `comment:examId:${examId}:${commentId}`,

  commentsByDisposition: (disposition: string, commentId: string) =>
    `comment:disposition:${disposition}:${commentId}`,

  commentsByUser: (userId: string, commentId: string) =>
    `comment:userId:${userId}:${commentId}`,

  commentsByQuestion: (questionId: string, commentId: string) =>
    `comment:questionId:${questionId}:${commentId}`,

  commentsByCategory: (category: string, commentId: string) =>
    `comment:category:${category}:${commentId}`,

  // Users - Two distinct types for different purposes:
  // 1. user: - Supabase auth user records (UUID from auth system)
  // 2. user-profile: - Extended user profile data (admin status, credits, metadata)
  user: (userId: string) => `user:${userId}`,
  
  userProfile: (userId: string) => `user-profile:${userId}`,

  userByEmail: (email: string) => `user:by-email:${email}`,

  // Questions by category (index)
  questionsByCategory: (category: string, questionId: string) =>
    `questions:by-category:${category}:${questionId}`,

  // Credit Transactions
  creditTransaction: (transactionId: string) => `credit-transaction:${transactionId}`,

  // Tours (for guided UI tours)
  tour: (tourId: string) => `tour:${tourId}`,

  // Testing Feedback (for QA testing feedback system)
  testingFeedback: (feedbackId: string) => `testing-feedback:${feedbackId}`,
  userFeedback: (feedbackId: string) => `user-feedback:${feedbackId}`,

  // User Feedback Index Keys (for efficient querying)
  userFeedbackByQuestion: (questionId: string, feedbackId: string) =>
    `user-feedback:questionId:${questionId}:${feedbackId}`,

  userFeedbackByUser: (userId: string, feedbackId: string) =>
    `user-feedback:userId:${userId}:${feedbackId}`,

  // Changelog (for version release notes)
  changelog: (entryId: string) => `changelog:${entryId}`,
};

/**
 * Utility functions for working with keys
 */
export const KeyUtils = {
  /**
   * Extract entity ID from a storage key
   * e.g., "question:1756691891290-e6p5rn0aa" -> "1756691891290-e6p5rn0aa"
   * e.g., "template:1760301126509-abc123xyz" -> "1760301126509-abc123xyz"
   * e.g., "user-profile:uuid-from-supabase" -> "uuid-from-supabase"
   */
  extractId: (key: string): string => {
    const colonIndex = key.indexOf(':');
    if (colonIndex === -1) return key;
    return key.substring(colonIndex + 1);
  },

  /**
   * Extract prefix from a storage key
   * e.g., "question:1756691891290-e6p5rn0aa" -> "question"
   * e.g., "user-profile:uuid" -> "user-profile"
   */
  extractPrefix: (key: string): string => {
    const colonIndex = key.indexOf(':');
    if (colonIndex === -1) return '';
    return key.substring(0, colonIndex);
  },

  /**
   * Extract timestamp from an ID
   * e.g., "1756691891290-e6p5rn0aa" -> 1756691891290
   */
  extractTimestamp: (id: string): number => {
    const hyphenIndex = id.indexOf('-');
    if (hyphenIndex === -1) return 0;
    return parseInt(id.substring(0, hyphenIndex), 10);
  },

  /**
   * Validate ID format (timestamp-suffix)
   */
  isValidId: (id: string): boolean => {
    const pattern = /^\d{13}-[a-z0-9]{9}$/;
    return pattern.test(id);
  },
};

/**
 * Key patterns for querying (used with kv.getByPrefix)
 */
export const KeyPatterns = {
  // Questions
  allQuestions: () => 'question:',
  allQuestionsInCategory: (category: string) => `questions:by-category:${category}:`,

  // Templates - NEW SHORT PREFIX
  allTemplates: () => 'template:',
  allTemplatesOld: () => 'exam-template:', // For migration support

  // Sessions - NEW SHORT PREFIX
  allSessions: () => 'session:',
  allSessionsOld: () => 'exam-session:', // For migration support

  // Results - NEW SHORT PREFIX
  allResults: () => 'result:',
  allResultsOld: () => 'exam-result:', // For migration support

  // Comments
  allComments: () => 'comment:',
  allCommentsForExam: (examId: string) => `comment:examId:${examId}:`,
  allCommentsForQuestion: (questionId: string) => `comment:questionId:${questionId}:`,
  allCommentsForUser: (userId: string) => `comment:userId:${userId}:`,
  allCommentsByDisposition: (disposition: string) => `comment:disposition:${disposition}:`,
  allCommentsByCategory: (category: string) => `comment:category:${category}:`,

  // Categories (only question categories - exam organization uses templates)
  allQuestionCategories: () => 'question-category:',

  // Users
  allUsers: () => 'user:',
  
  // User Profiles (extended user data)
  allUserProfiles: () => 'user-profile:',

  // Credit Transactions
  allCreditTransactions: () => 'credit-transaction:',

  // Tours
  allTours: () => 'tour:',

  // Testing Feedback
  allTestingFeedback: () => 'testing-feedback:',
  allUserFeedback: () => 'user-feedback:',
  allUserFeedbackByQuestion: (questionId: string) => `user-feedback:questionId:${questionId}:`,
  allUserFeedbackByUser: (userId: string) => `user-feedback:userId:${userId}:`,
  
  // Changelog
  allChangelog: () => 'changelog:',
};

/**
 * Migration helpers for transitioning from old format to new format
 */
export const MigrationUtils = {
  /**
   * Check if an ID uses the old format
   * Old formats:
   * - "question-1756691891290-e6p5rn0aa" (has prefix in ID)
   * - "template-1760301126509" (has prefix, missing suffix)
   * - "exam-1759534929413-8f2c7b6e..." (has "exam-" prefix)
   */
  isOldFormat: (id: string): boolean => {
    // Old format has a prefix before the timestamp
    return id.includes('-') && !/^\d{13}-[a-z0-9]+$/.test(id);
  },

  /**
   * Convert old ID format to new format
   * "question-1756691891290-e6p5rn0aa" -> "1756691891290-e6p5rn0aa"
   * "template-1760301126509" -> "1760301126509-{newSuffix}"
   * "exam-1759534929413-uuid" -> "1759534929413-{newSuffix}"
   */
  convertOldId: (oldId: string): string => {
    // If already new format, return as-is
    if (!MigrationUtils.isOldFormat(oldId)) {
      return oldId;
    }

    // Remove common prefixes
    let cleaned = oldId
      .replace(/^question-/, '')
      .replace(/^template-/, '')
      .replace(/^exam-/, '')
      .replace(/^session-/, '')
      .replace(/^result-/, '');

    // If it doesn't have a proper suffix (9 chars), add one
    const parts = cleaned.split('-');
    if (parts.length < 2 || parts[1].length < 9) {
      const timestamp = parts[0];
      const suffix = Math.random().toString(36).substr(2, 9);
      return `${timestamp}-${suffix}`;
    }

    // If suffix is a UUID (too long), replace with short suffix
    if (parts[1].length > 15) {
      const timestamp = parts[0];
      const suffix = Math.random().toString(36).substr(2, 9);
      return `${timestamp}-${suffix}`;
    }

    return cleaned;
  },

  /**
   * Normalize an ID to new format (called during entity retrieval)
   */
  normalizeId: (id: string): string => {
    if (MigrationUtils.isOldFormat(id)) {
      return MigrationUtils.convertOldId(id);
    }
    return id;
  },
};

/**
 * Helper function to get entity with fallback to old format
 * Used during migration period to support both old and new key formats
 */
export async function getEntityWithFallback(
  kv: any,
  newKey: string,
  oldKey?: string
): Promise<any> {
  let entity = await kv.get(newKey);
  if (!entity && oldKey) {
    entity = await kv.get(oldKey);
    if (entity) {
      console.log(`⚠️ Found entity in old format: ${oldKey}`);
    }
  }
  return entity;
}

/**
 * Helper function to get entities by prefix with fallback
 * Used during migration period to support both old and new key formats
 * 
 * IMPORTANT: Searches BOTH prefixes and merges results (not either/or)
 * This ensures we find all entities regardless of format during migration
 */
export async function getByPrefixWithFallback(
  kv: any,
  newPrefix: string,
  oldPrefix?: string
): Promise<any[]> {
  const newItems = await kv.getByPrefix(newPrefix);
  
  if (!oldPrefix) {
    return newItems;
  }
  
  const oldItems = await kv.getByPrefix(oldPrefix);
  
  if (oldItems.length > 0) {
    console.log(`⚠️ Found ${oldItems.length} entities in old format with prefix: ${oldPrefix}`);
    console.log(`✅ Found ${newItems.length} entities in new format with prefix: ${newPrefix}`);
  }
  
  // Merge both result sets (deduplicate by key if needed)
  const allItems = [...newItems, ...oldItems];
  
  // Deduplicate by key (in case same entity exists in both formats)
  const uniqueItems = Array.from(
    new Map(allItems.map(item => [item.key, item])).values()
  );
  
  return uniqueItems;
}
