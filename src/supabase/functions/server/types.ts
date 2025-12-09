// Standardized type definitions for exam platform server
// Format: All IDs use timestamp-random format: "1756691891290-e6p5rn0aa"

// =============================================================================
// CORE ENTITY TYPES
// =============================================================================

// NEC Edition codes - standardized list of supported editions
export const NEC_EDITIONS = [
  'NEC-2014',
  'NEC-2017',
  'NEC-2020',
  'NEC-2023',
  'NEC-2026',
] as const;

export type NecEdition = typeof NEC_EDITIONS[number];

// Update all templates
export interface BulkTemplateUpdate {
  id: string;
  display_order: number;
}

// Edition-specific metadata for a question
export interface QuestionEdition {
  code: NecEdition;          // "NEC-2023", "NEC-2026", etc.
  category: string;          // Category for THIS edition (can differ between editions)
  reference?: string;        // Code reference for THIS edition (can differ between editions)
  isValid: boolean;          // Is this question applicable to this edition?
  notes?: string;            // Admin notes about what changed between editions
  updatedAt?: string;        // When this edition metadata was last updated
}

export interface Comment {
  id: string;                   // Format: "1756691891290-e6p5rn0aa" (timestamp-random)
  examId: string | null;        // Format: "1756691891290-e6p5rn0aa" (timestamp-random) - Can be null
  questionId: string | null;    // Format: "1756691891290-e6p5rn0aa" (timestamp-random) - Can be null
  userId: string;               // Supabase UUID: "8f2c7b6e-f31c-4827-bf87-7156591a53e6"
  content: string;
  category: CommentCategory;
  disposition: CommentDisposition;
  createdAt: string;
  updatedAt: string;
  responses: CommentResponse[];
  metadata?: Record<string, any>;
  context?: 'during_exam' | 'after_exam';
  needs_attention?: boolean;
  // User/Question enrichment fields (not stored, computed on read)
  userEmail?: string;
  userName?: string;
  questionText?: string;
  questionCategory?: string;
}

export interface CommentResponse {
  id: string;                   // Format: "1756691891290-e6p5rn0aa" (timestamp-random)
  content: string;
  adminUserId: string;
  createdAt: string;
}

export type CommentCategory = 
  | 'Uncategorized'
  | 'Spelling' 
  | 'Flawed Logic' 
  | 'Poor Structure'
  | 'Other';  // Legacy category - now maps to 'Uncategorized'

export type CommentDisposition = 
  | 'Under Review' 
  | 'Resolved' 
  | 'Rejected' 
  | 'In Progress'
  | 'Archived';

export interface User {
  id: string;                   // Supabase UUID
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string;
}

// User profile stored in KV store
export interface UserProfile {
  id?: string;
  name?: string;
  email?: string;
  is_admin?: boolean;
  credits?: number;
  created_at?: string;
}

// Enriched user for comment/result enrichment (merges auth user + profile)
export interface EnrichedUser {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  credits: number;
  created_at: string;
}

export interface Question {
  id: string;                   // Format: "1756691891290-e6p5rn0aa" or "question:timestamp-random"
  question: string;             // The question text (matches database field)
  options: string[];            // Array of answer choices (matches database field)
  correctAnswer: number;        // Index of correct answer 0-3 (matches database field)
  
  // Edition-aware fields (NEW)
  editions: QuestionEdition[];  // Array of edition-specific metadata
  
  // Legacy fields (still used for single-edition compatibility)
  category: string;
  reference?: string;           // Code reference (e.g., "240.4(D)(3)")
  
  explanation?: string;         // Explanation for the answer
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  status?: 'Draft' | 'Final';
  createdAt?: string;           // ISO timestamp (camelCase - newer records)
  updatedAt?: string;           // ISO timestamp (camelCase - newer records)
  created_at?: string;          // ISO timestamp (snake_case - legacy records)
  updated_at?: string;          // ISO timestamp (snake_case - legacy records)
  created_by?: string;          // User ID or "migration"
  updated_by?: string;          // User ID who last updated
}

export interface Answer {
  questionId: string;
  selectedAnswers: string[];    // Selected answer IDs
  correctAnswers: string[];     // Correct answer IDs (for scoring)
  isCorrect: boolean;
  timeSpent: number;           // seconds on this question
  flagged: boolean;
  confidence?: 1 | 2 | 3 | 4 | 5;
  answeredAt: string;
}

export interface ExamTemplate {
  id: string;                   // Format: "1756691891290-e6p5rn0aa" (timestamp-random)
  title: string;
  description: string;
  
  // Edition designation
  edition: NecEdition;          // Which NEC edition this template is based on
  
  // Core exam settings
  timeLimit: number;            // minutes
  questionCount: number;        // total questions
  passingPercentage?: number;   // passing score threshold (default: 70)
  
  // Question distribution
  questionCategories?: Record<string, number>;
  
  // Metadata
  templateName?: string;        // e.g. "02 Journeyman", "Master Electrician"
  moreDetails?: string;         // Rich text description
  price?: number;               // exam cost (0 for free)
  displayOrder?: number;        // for sorting in UI
  isDraft?: boolean;            // draft vs published
  
  // Audit fields
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;           // User ID or "migration"
  updatedBy?: string;           // User ID who last updated
}

export interface ExamSession {
  id: string;                   // Format: "1756691891290-e6p5rn0aa" (timestamp-random)
  userId: string;
  templateId: string;
  title?: string;               // Exam title for display
  questions: Question[];
  answers: Record<string, number>;  // questionId -> answer index (0-3)
  startTime: string;
  timeLimit: number;            // seconds
  status: 'in_progress' | 'completed' | 'abandoned';
  currentQuestionIndex?: number;
  comments?: Record<string, string>;
  flags?: Record<string, boolean>;
  bookmarks?: Record<string, boolean>;
  eliminatedAnswers?: Record<string, Set<number>>;
}

// Admin-enriched session view with calculated fields
export interface AdminExamSession {
  id: string;
  sessionId: string;
  templateId: string;
  examTitle: string;
  studentId: string;           // User's display name or email
  userId: string;              // Supabase UUID
  startTime: string;
  timeLimit: number;           // minutes
  status: string;
  questionsCount: number;
  answersCount: number;
  ageInHours: number;
  isStale: boolean;
}

export interface ExamResult {
  id: string;                   // Format: "1756691891290-e6p5rn0aa" (timestamp-random)
  examId: string;               // Session ID
  userId: string;
  templateId: string;
  startedAt: string;
  completedAt?: string;
  answers: Record<string, Answer>;  // questionId -> Answer
  score?: number;
  totalQuestions: number;
  correctAnswers: number;
  status: ExamStatus;           // NOTE: Not currently set by server - status computed from completedAt/score
  timeSpent: number;            // seconds
}

export type ExamStatus = 'in-progress' | 'completed' | 'abandoned';

export interface QuestionCategory {
  id: string;                   // Human-readable OR timestamp-random
  name: string;
  description?: string;
  createdAt: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ApiError {
  success: false;
  error: string;
  details?: any;
}

// Request types
export interface CreateCommentRequest {
  examId: string;
  questionId: string;
  content: string;
  category: CommentCategory;
}

export interface UpdateCommentRequest {
  disposition?: CommentDisposition;
  response?: {
    content: string;
    adminUserId: string;
  };
  metadata?: Record<string, any>;
}

export interface CreateExamResultRequest {
  examId: string;
  userId: string;
  templateId: string;
}

export interface UpdateAnswerRequest {
  questionId: string;
  selectedAnswers: string[];
  timeSpent: number;
  flagged?: boolean;
  confidence?: number;
}

// KV Store types
export interface KvItem {
  key: string;
  value: any;
}

// Server-internal types for authentication and operations
export interface AuthResult {
  isAdmin: boolean;
  error?: string;
  status?: number;
  user?: any;
  profileData?: any;
}

export interface UserExam {
  id: string;
  examId: string;
  examTitle: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  timeSpent: number;
  passed: boolean;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'purchase' | 'deduction' | 'refund' | 'admin_issued';
  description?: string;
  note?: string;  // Admin notes when issuing credits
  examId?: string;
  createdAt: string;
  issuedAt?: string;  // For admin-issued credits
  issuedBy?: string;  // Admin user ID who issued the credits
}

// Server-internal exam result format (different from shared types)
export interface ServerExamResult {
  examId: string;
  userId?: string;  // User who took the exam
  templateId: string;
  title: string;
  completedAt: string;
  score: number;
  percentage: number;
  passed: boolean;
  answers: Record<string, number>;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  skippedQuestions: number;
  answeredQuestions?: number;  // Number of questions answered
  timeSpent: number;
  detailedResults?: DetailedResult[];  // Detailed question-by-question results
}

// Server-internal types for exam results
export interface DetailedResult {
  questionId: string;
  question: string;
  userAnswer: number;
  correctAnswer: number | null;
  isCorrect: boolean;
  category: string;
  codeReference?: string;
}

export interface UserFeedback {
  id: string;                   // Format: "1756691891290-e6p5rn0aa"
  questionId: string;           // Format: "1756691891290-e6p5rn0aa"
  userId: string;               // Supabase UUID
  comment: string;
  category?: string;            // User-selected category: "Uncategorized" | "Spelling" | "Flawed Logic" | "Poor Structure"
  context: string;              // "exam_review", "practice_mode", etc.
  createdAt: string;
  
  // Optional metadata
  examSessionId?: string;       // If submitted during exam review
  userEmail?: string;           // Populated from user lookup
  userName?: string;            // Populated from user lookup
  
  // Admin review fields (set when admin reviews the feedback)
  reviewedAt?: string;
  reviewedBy?: string;
  adminNotes?: string;
  status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
}

// =============================================================================
// FORM TYPES (for Admin UI)
// =============================================================================

export interface QuestionForm {
  question: string;
  options: string[];
  correctAnswer: number;
  
  // Edition-aware fields (NEW)
  editions: QuestionEdition[];  // Array of edition-specific metadata
  
  // Legacy fields (still used for single-edition compatibility)
  category: string;
  reference?: string;
  
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  status?: 'Draft' | 'Final';
  explanation?: string;
}

export interface TemplateForm {
  title: string;
  description: string;
  moreDetails?: string;
  questionCount: number;
  timeLimit: number;
  templateName: string;
  
  // Edition designation
  edition: NecEdition;          // Which NEC edition this template is based on
  
  passingPercentage?: number;
  price?: number;
  questionCategories?: Record<string, number>;
}

export interface QuestionFilters {
  searchTerm: string;
  category: string;
  difficulty: string;
  dateFrom: string;
  dateTo: string;
  hasReference: boolean | null;
  status: string;
}