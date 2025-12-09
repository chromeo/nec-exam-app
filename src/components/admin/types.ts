/**
 * Shared Admin Section Types
 * Single source of truth for all admin sections
 */
export type AdminSection = 
  // Core Management
  | 'dashboard'
  | 'questions'
  | 'question-categories'
  | 'exam-templates'
  | 'results'
  | 'sessions'
  | 'users'
  | 'comments'
  | 'testing-feedback'
  
  // Production Tools
  | 'api-validation'
  | 'route-testing'
  | 'tour-management'
  | 'debug';
  
// NOTE: 'exam-categories' was removed - we only use 'question-categories'
// Exam organization is handled via 'exam-templates' instead
// NOTE: 'type-safety-testing' was removed (YAGNI - development tool only)