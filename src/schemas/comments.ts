// API contract types for comments (matches current server implementation)

export interface Comment {
  id: string;
  userId: string;
  questionId: string;
  examId: string;
  content: string;
  comment?: string; // Legacy field
  category: string;
  type: string;
  disposition: string;
  createdAt: string;
  updatedAt: string;
  responses: Array<{
    id: string;
    content: string;
    adminUserId: string;
    createdAt: string;
  }>;
  metadata: Record<string, any>;
  // Enriched fields from joins
  userEmail?: string;
  userName?: string;
  questionText?: string;
  questionCategory?: string;
  questionPreview?: string;
}

// What the frontend sends to update a comment (matches current server implementation)
export interface CommentUpdateRequest {
  disposition?: string;
  response?: {
    content: string;
    adminUserId: string;
  };
  metadata?: Record<string, any>;
}

// What the server responds with
export interface CommentUpdateResponse {
  success: boolean;
  data?: {
    comment: Comment;
  };
  error?: string;
}

// Validation helpers (simple runtime checks)
export const validateCommentUpdateRequest = (data: any): CommentUpdateRequest => {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid comment update request: must be an object');
  }
  
  if (data.disposition && typeof data.disposition !== 'string') {
    throw new Error('Invalid comment update request: disposition must be a string');
  }
  
  if (data.response) {
    if (typeof data.response !== 'object' || !data.response.content || !data.response.adminUserId) {
      throw new Error('Invalid comment update request: response must have content and adminUserId');
    }
  }
  
  console.log('✅ Comment update request validation passed');
  return data as CommentUpdateRequest;
};

export const validateCommentUpdateResponse = (data: any): CommentUpdateResponse => {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid comment update response: must be an object');
  }
  
  if (typeof data.success !== 'boolean') {
    throw new Error('Invalid comment update response: success must be a boolean');
  }
  
  console.log('✅ Comment update response validation passed');
  return data as CommentUpdateResponse;
};