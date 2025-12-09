// Runtime validation schemas using Zod for all API endpoints
// This provides type-safe validation and ensures frontend/backend contract compliance

import { z } from 'zod';

// =============================================================================
// CORE ENTITY SCHEMAS
// =============================================================================

// Comment schemas - UPDATED to match types.ts
export const CommentCategorySchema = z.enum([
  'Uncategorized',
  'Spelling',
  'Flawed Logic',
  'Poor Structure',
  'Other'  // Legacy category - existing data compatibility
]);

export const CommentDispositionSchema = z.enum([
  'Under Review',
  'Resolved',
  'Rejected', 
  'In Progress',
  'Archived'
]);

export const CommentResponseSchema = z.object({
  id: z.string(),
  content: z.string().min(1, 'Response content cannot be empty'),
  adminUserId: z.string(),
  createdAt: z.string()
});

export const CommentSchema = z.object({
  id: z.string(),
  examId: z.string().nullable(),  // ✅ FIXED: Made nullable to match types.ts
  questionId: z.string().nullable(),  // ✅ FIXED: Made nullable to match types.ts
  userId: z.string(),
  content: z.string().min(1, 'Comment content cannot be empty'),
  category: CommentCategorySchema,
  disposition: CommentDispositionSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  responses: z.array(CommentResponseSchema).default([]),
  metadata: z.record(z.any()).optional(),
  context: z.enum(['during_exam', 'after_exam']).optional(),  // ✅ Added runtime field
  needs_attention: z.boolean().optional(),  // ✅ Added runtime field
  // Populated fields (not stored, computed on read)
  userEmail: z.string().email().optional(),
  userName: z.string().optional(),
  questionText: z.string().optional(),
  questionCategory: z.string().optional()
});

// Answer schemas
export const AnswerSchema = z.object({
  questionId: z.string(),
  selectedAnswers: z.array(z.string()),
  correctAnswers: z.array(z.string()),
  isCorrect: z.boolean(),
  timeSpent: z.number().min(0),
  flagged: z.boolean(),
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  answeredAt: z.string()
});

// Exam status and result schemas
export const ExamStatusSchema = z.enum(['in-progress', 'completed', 'abandoned']);

export const ExamResultSchema = z.object({
  id: z.string(),
  examId: z.string(),
  userId: z.string(),
  templateId: z.string(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  answers: z.record(z.string(), AnswerSchema),
  score: z.number().min(0).max(100).optional(),
  totalQuestions: z.number().min(1),
  correctAnswers: z.number().min(0),
  status: ExamStatusSchema,
  timeSpent: z.number().min(0)
});

// User schemas
export const UserRoleSchema = z.enum(['user', 'admin']);

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1, 'Name cannot be empty'),
  role: UserRoleSchema,
  createdAt: z.string()
});

// Question schemas
export const DifficultySchema = z.enum(['Easy', 'Medium', 'Hard']);
export const QuestionStatusSchema = z.enum(['Draft', 'Final']);

// ✅ UPDATED: Question schema matching actual database format
export const QuestionSchema = z.object({
  id: z.string(),
  question: z.string().min(1, 'Question text cannot be empty'),  // ✅ Correct field name
  category: z.string().min(1, 'Category cannot be empty'),
  options: z.array(z.string()).min(2, 'Must have at least 2 answer options'),  // ✅ Simple string array
  correctAnswer: z.number().int().min(0).max(3),  // ✅ Single number index (0-3)
  explanation: z.string().optional(),
  reference: z.string().optional(),
  difficulty: DifficultySchema.optional(),
  status: QuestionStatusSchema.optional(),
  createdAt: z.string().optional(),    // Made optional for flexibility
  updatedAt: z.string().optional(),
  created_at: z.string().optional(),   // Support legacy snake_case
  updated_at: z.string().optional(),   // Support legacy snake_case
  created_by: z.string().optional(),   // Metadata
  updated_by: z.string().optional()    // Metadata
});

// Exam template schemas
export const ExamTemplateSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title cannot be empty'),
  description: z.string().min(1, 'Description cannot be empty'),
  timeLimit: z.number().min(1, 'Time limit must be at least 1 minute'),
  questionCount: z.number().min(1, 'Must have at least 1 question'),
  template_name: z.string().optional(),  // ✅ FIXED: Made optional - not all templates have this field
  createdAt: z.string(),
  updatedAt: z.string().optional(),  // ✅ FIXED: Made optional - not all templates have been updated
  moreDetails: z.string().optional(),
  price: z.number().min(0).optional(),
  questionCategories: z.record(z.number().min(0)).optional(),
  displayOrder: z.number().optional(),
  is_draft: z.boolean().optional(),
  created_by: z.string().optional()
});

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

// Comment request schemas
export const CreateCommentRequestSchema = z.object({
  examId: z.string().nullable(),  // ✅ FIXED: Made nullable
  questionId: z.string().nullable(),  // ✅ FIXED: Made nullable
  content: z.string().min(1, 'Comment content cannot be empty'),
  category: CommentCategorySchema
});

export const UpdateCommentRequestSchema = z.object({
  disposition: CommentDispositionSchema.optional(),
  response: z.object({
    content: z.string().min(1, 'Response content cannot be empty'),
    adminUserId: z.string()
  }).optional(),
  metadata: z.record(z.any()).optional()
});

// Question request schemas
export const QuestionFormSchema = z.object({
  question: z.string().min(1, 'Question text cannot be empty'),
  options: z.array(z.string().min(1, 'Option text cannot be empty')).min(2, 'Must have at least 2 options'),
  correctAnswer: z.number().min(0, 'Correct answer index must be valid'),
  category: z.string().min(1, 'Category cannot be empty'),
  reference: z.string().optional(),
  difficulty: DifficultySchema,
  status: QuestionStatusSchema.optional()
});

// Template request schemas
export const TemplateFormSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  description: z.string().min(1, 'Description cannot be empty'),
  time_limit: z.number().min(1, 'Time limit must be at least 1 minute'),
  question_count: z.number().min(1, 'Must have at least 1 question'),
  category: z.string().min(1, 'Category cannot be empty'),
  moreDetails: z.string().optional(),
  price: z.number().min(0).optional(),
  questionCategories: z.record(z.number().min(0)).optional()
});

// Exam session request schemas
export const CreateExamResultRequestSchema = z.object({
  examId: z.string(),
  userId: z.string(),
  templateId: z.string()
});

export const UpdateAnswerRequestSchema = z.object({
  questionId: z.string(),
  selectedAnswers: z.array(z.string()),
  timeSpent: z.number().min(0),
  flagged: z.boolean().optional(),
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional()
});

// Bulk operation schemas
export const BulkOperationSchema = z.object({
  operation: z.enum(['delete', 'changeCategory', 'changeDifficulty', 'changeStatus']),
  questionIds: z.array(z.string()).min(1, 'Must select at least one item'),
  targetValue: z.string().optional()
});

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

// Standard API response wrapper
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional()
});

// Paginated response schema
export const PaginatedResponseSchema = z.object({
  items: z.array(z.any()),
  pagination: z.object({
    page: z.number().min(1),
    limit: z.number().min(1),
    total: z.number().min(0),
    totalPages: z.number().min(0)
  })
});

// =============================================================================
// VALIDATION HELPER FUNCTIONS
// =============================================================================

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError && error.errors && Array.isArray(error.errors)) {
      const errorMessage = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }
    throw error;
  }
}

export function validateResponse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    console.warn('⚠️ Response validation failed:', error);
    // In development, we might want to be strict, but in production we could be more lenient
    return data as T;
  }
}

// Safe validation that returns success/error instead of throwing
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError && error.errors && Array.isArray(error.errors)) {
      const errorMessage = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      return { success: false, error: `Validation failed: ${errorMessage}` };
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
    return { success: false, error: errorMessage };
  }
}

// =============================================================================
// TYPE EXPORTS (derived from schemas)
// =============================================================================

export type CreateCommentRequest = z.infer<typeof CreateCommentRequestSchema>;
export type UpdateCommentRequest = z.infer<typeof UpdateCommentRequestSchema>;
export type QuestionForm = z.infer<typeof QuestionFormSchema>;
export type TemplateForm = z.infer<typeof TemplateFormSchema>;
export type CreateExamResultRequest = z.infer<typeof CreateExamResultRequestSchema>;
export type UpdateAnswerRequest = z.infer<typeof UpdateAnswerRequestSchema>;
export type BulkOperation = z.infer<typeof BulkOperationSchema>;
export type ApiResponse<T = any> = z.infer<typeof ApiResponseSchema> & { data?: T };
export type PaginatedResponse<T> = z.infer<typeof PaginatedResponseSchema> & { items: T[] };