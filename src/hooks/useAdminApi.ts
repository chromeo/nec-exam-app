import { useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import type { 
  Question, 
  ExamTemplate, 
  ExamResult, 
  QuestionForm, 
  TemplateForm,
  Comment as UserComment,
  ApiResponse 
} from '../supabase/functions/server/types';

export const useAdminApi = (accessToken?: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165`;

  const makeRequest = async <T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // For admin operations, we must have an access token
      if (!accessToken) {
        throw new Error('Admin operations require authentication');
      }
      const authToken = accessToken;
      const fullUrl = `${serverUrl}${endpoint}`;
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      const responseText = await response.text();

      if (!response.ok) {
        console.error('❌ HTTP Error Response:', responseText);
        throw new Error(`HTTP status ${response.status}: ${response.statusText}`);
      }
      
      // Try to parse as JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('🚨 Parse error:', parseError);
        console.error('📝 Raw text that failed to parse:');
        console.error(responseText);
        throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
      }
      
      setIsLoading(false);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('💥 useAdminApi makeRequest error:');
      console.error('📝 Error message:', errorMessage);
      console.error('🔍 Full error:', err);
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  // Questions API
  const questionsApi = {
    getAll: () => makeRequest<Question[]>('/admin/questions'),
    create: (question: QuestionForm) => makeRequest<Question>('/admin/questions', {
      method: 'POST',
      body: JSON.stringify(question),
    }),
    update: (id: string, question: QuestionForm) => makeRequest<Question>(`/admin/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(question),
    }),
    delete: (id: string) => makeRequest(`/admin/questions/${id}`, {
      method: 'DELETE',
    }),
    // New bulk operations
    bulkOperation: (operation: string, questionIds: string[], targetValue?: string) => makeRequest('/admin/questions/bulk', {
      method: 'POST',
      body: JSON.stringify({ operation, questionIds, targetValue }),
    }),
    // Import/Export operations
    import: (questions: Question[], overwrite?: boolean) => makeRequest('/admin/questions/import', {
      method: 'POST',
      body: JSON.stringify({ questions, overwrite }),
    }),
    // Status migration for existing questions
    migrateStatus: () => makeRequest('/admin/questions/migrate-status', {
      method: 'POST',
    }),
    // Import NEC 2023 questions
    importNEC2023: () => makeRequest('/admin/questions/import-nec-2023', {
      method: 'POST',
    }),
  };

  // Question Categories API
  const questionCategoriesApi = {
    getAll: () => makeRequest<string[]>('/admin/question-categories'),
    create: (name: string) => makeRequest('/admin/question-categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
    update: (oldName: string, newName: string) => makeRequest(`/admin/question-categories/${encodeURIComponent(oldName)}`, {
      method: 'PUT',
      body: JSON.stringify({ name: newName }),
    }),
    delete: (name: string) => makeRequest(`/admin/question-categories/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    }),
  };

  // Exam Templates API
  const templatesApi = {
    getAll: () => makeRequest<ExamTemplate[]>('/admin/exam-templates'),
    create: (template: TemplateForm) => makeRequest<ExamTemplate>('/admin/exam-templates', {
      method: 'POST',
      body: JSON.stringify(template),
    }),
    update: (id: string, template: TemplateForm) => makeRequest<ExamTemplate>(`/admin/exam-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    }),
    delete: (id: string) => makeRequest(`/admin/exam-templates/${id}`, {
      method: 'DELETE',
    }),
    // New clone operation
    clone: (id: string) => makeRequest<ExamTemplate>(`/admin/exam-templates/${id}/clone`, {
      method: 'POST',
    }),
    // New bulk operations
    bulkOperation: (operation: string, templateIds: string[]) => makeRequest('/admin/exam-templates/bulk', {
      method: 'POST',
      body: JSON.stringify({ operation, templateIds }),
    }),
  };

  // Exam Results API ?_t=${Date.now()}
  const resultsApi = {
    getAll: () => makeRequest<ExamResult[]>(`/admin/results`),
    delete: (id: string) => makeRequest(`/admin/results/${id}`, {
      method: 'DELETE',
    }),
  };

  // Comments API
  const commentsApi = {
    getAll: (showArchived?: boolean) => {
      const params = new URLSearchParams();
      if (showArchived) params.append('showArchived', 'true');
      const query = params.toString();
      return makeRequest<UserComment[]>(`/admin/comments${query ? `?${query}` : ''}`);
    },
    update: (id: string, comment: CommentForm | any) => makeRequest<UserComment>(`/admin/comments/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(comment),
    }),
    delete: (id: string) => makeRequest(`/admin/comments/${id}`, {
      method: 'DELETE',
    }),
    respond: (id: string, response: string) => makeRequest<UserComment>(`/admin/comments/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response }),
    }),
  };

  // User Feedback API (separate from admin comments)
  const userFeedbackApi = {
    getAll: (questionId?: string, status?: string) => {
      const params = new URLSearchParams();
      if (questionId) params.append('questionId', questionId);
      if (status) params.append('status', status);
      const query = params.toString();
      return makeRequest(`/admin/user-feedback${query ? `?${query}` : ''}`);
    },
    update: (id: string, updates: { status?: string; adminNotes?: string }) => 
      makeRequest(`/admin/user-feedback/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    delete: (id: string) => makeRequest(`/admin/user-feedback/${id}`, {
      method: 'DELETE',
    }),
  };

  // Sessions API (exam sessions management)
  const sessionsApi = {
    getAll: () => makeRequest('/admin/sessions'),
    delete: (id: string) => makeRequest(`/admin/sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
    cleanupStale: (hoursThreshold: number = 4) => makeRequest('/admin/sessions/cleanup-stale', {
      method: 'POST',
      body: JSON.stringify({ hoursThreshold }),
    }),
  };

  return {
    isLoading,
    error,
    makeRequest,
    questionsApi,
    questionCategoriesApi,
    templatesApi,
    resultsApi,
    commentsApi,
    userFeedbackApi,
    sessionsApi,
  };
};