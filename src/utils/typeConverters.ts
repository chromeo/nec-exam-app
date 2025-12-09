/**
 * Type conversion utilities for handling snake_case ↔ camelCase conversion
 * at the database boundary during the admin types migration.
 * 
 * Created: Wednesday, October 01, 2025 at 4:45 PM PDT
 */

import type { 
  ExamTemplate, 
  ExamResult, 
  Question,
  TemplateForm 
} from '../supabase/functions/server/types';

// Database format interfaces (snake_case - what's actually stored)
interface DbExamTemplate {
  id: string;
  title: string;
  description: string;
  time_limit: number;
  question_count: number;
  template_name: string;
  more_details?: string;
  price?: number;
  question_categories?: Record<string, number>;
  created_at: string;
  updated_at?: string;
}

interface DbExamResult {
  id: string;
  user_id: string;
  template_id: string;
  student_id: string;
  template_title: string;
  exam_title: string;
  score: number;
  total_questions: number;
  answered_questions: number;
  percentage: number;
  submitted_at: string;
  time_spent: number;
  status: string;
  started_at: string;
  time_limit: number;
  answers: Record<string, any>;
  questions: any[];
  detailed_results?: Array<{
    question_id: string;
    question: string;
    user_answer: number | null;
    correct_answer: number;
    is_correct: boolean;
    category: string;
    comment?: string;
  }>;
  question_comments?: Record<string, string>;
  flagged_questions?: Record<string, boolean>;
}

interface DbTemplateForm {
  title: string;
  description: string;
  time_limit: number;
  question_count: number;
  template_name: string;
  more_details?: string;
  price?: number;
  question_categories?: Record<string, number>;
}

/**
 * Convert ExamTemplate from camelCase (TypeScript) to snake_case (Database)
 */
export const convertTemplateToDbFormat = (template: ExamTemplate): DbExamTemplate => ({
  id: template.id,
  title: template.title,
  description: template.description,
  time_limit: template.timeLimit,
  question_count: template.questionCount,
  template_name: template.template_name || '', // e.g. "02 Journeyman"
  more_details: template.moreDetails,
  price: template.price,
  question_categories: template.questionCategories,
  created_at: template.createdAt,
  updated_at: template.updatedAt
});

/**
 * Convert ExamTemplate from snake_case (Database) to camelCase (TypeScript)
 */
export const convertTemplateFromDbFormat = (dbTemplate: DbExamTemplate): ExamTemplate => ({
  id: dbTemplate.id,
  title: dbTemplate.title,
  description: dbTemplate.description,
  timeLimit: dbTemplate.time_limit,
  questionCount: dbTemplate.question_count,
  template_name: dbTemplate.template_name || '', // e.g. "02 Journeyman"
  createdAt: dbTemplate.created_at,
  updatedAt: dbTemplate.updated_at || dbTemplate.created_at,
  moreDetails: dbTemplate.more_details,
  price: dbTemplate.price,
  questionCategories: dbTemplate.question_categories
});

/**
 * Convert TemplateForm from camelCase (TypeScript) to snake_case (Database)
 */
export const convertTemplateFormToDbFormat = (form: TemplateForm): DbTemplateForm => ({
  title: form.title,
  description: form.description,
  time_limit: form.timeLimit,
  question_count: form.questionCount,
  template_name: form.template_name || '', // e.g. "02 Journeyman"
  more_details: form.moreDetails,
  price: form.price,
  question_categories: form.questionCategories
});

/**
 * Convert ExamResult from snake_case (Database) to camelCase (TypeScript)
 */
export const convertResultFromDbFormat = (dbResult: DbExamResult): ExamResult => ({
  id: dbResult.id,
  examId: dbResult.id, // Using same ID for examId
  userId: dbResult.user_id,
  templateId: dbResult.template_id,
  startedAt: dbResult.started_at,
  completedAt: dbResult.submitted_at,
  answers: dbResult.answers || {},
  score: dbResult.score,
  totalQuestions: dbResult.total_questions,
  correctAnswers: dbResult.score || 0, // Approximation, may need adjustment
  status: mapLegacyStatusToCleanStatus(dbResult.status),
  timeSpent: dbResult.time_spent
});

/**
 * Convert ExamResult from camelCase (TypeScript) to snake_case (Database)
 */
export const convertResultToDbFormat = (result: ExamResult): DbExamResult => ({
  id: result.id,
  user_id: result.userId,
  template_id: result.templateId,
  student_id: result.userId, // Using userId as studentId for legacy compatibility
  template_title: '', // Would need to be populated from template lookup
  exam_title: '', // Would need to be populated from template lookup
  score: result.score || 0,
  total_questions: result.totalQuestions,
  answered_questions: Object.keys(result.answers).length,
  percentage: result.totalQuestions > 0 ? Math.round((result.correctAnswers / result.totalQuestions) * 100) : 0,
  submitted_at: result.completedAt || new Date().toISOString(),
  time_spent: result.timeSpent,
  status: mapCleanStatusToLegacyStatus(result.status),
  started_at: result.startedAt,
  time_limit: 0, // Would need to be populated from template lookup
  answers: result.answers,
  questions: [], // Would need to be populated separately
  detailed_results: [], // Would need to be computed from answers
  question_comments: {}, // Legacy field
  flagged_questions: {} // Legacy field
});

/**
 * Map legacy status values to clean API status values
 */
const mapLegacyStatusToCleanStatus = (legacyStatus: string): 'in-progress' | 'completed' | 'abandoned' => {
  switch (legacyStatus?.toLowerCase()) {
    case 'completed':
    case 'submitted':
      return 'completed';
    case 'in-progress':
    case 'active':
      return 'in-progress';
    case 'abandoned':
    case 'timeout':
      return 'abandoned';
    default:
      return 'in-progress';
  }
};

/**
 * Map clean API status values to legacy status values
 */
const mapCleanStatusToLegacyStatus = (cleanStatus: 'in-progress' | 'completed' | 'abandoned'): string => {
  switch (cleanStatus) {
    case 'completed':
      return 'completed';
    case 'in-progress':
      return 'in-progress';
    case 'abandoned':
      return 'abandoned';
    default:
      return 'in-progress';
  }
};

/**
 * Temporary compatibility helper for mixed format objects during migration
 */
export const getTimeLimit = (template: any): number => {
  return template.timeLimit ?? template.time_limit ?? 0;
};

export const getQuestionCount = (template: any): number => {
  return template.questionCount ?? template.question_count ?? 0;
};

export const getUserId = (result: any): string => {
  return result.userId ?? result.user_id ?? '';
};

export const getTemplateId = (result: any): string => {
  return result.templateId ?? result.template_id ?? '';
};

export const getStartedAt = (result: any): string => {
  return result.startedAt ?? result.started_at ?? '';
};