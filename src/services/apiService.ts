import { projectId, publicAnonKey } from '../utils/supabase/info';

const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165`;

export class ApiService {
  private static async makeRequest(
    endpoint: string, 
    options: RequestInit = {}, 
    accessToken?: string
  ) {
    const authToken = accessToken || publicAnonKey;
    const isLogoutEndpoint = endpoint.includes('/auth/logout');
    
    try {
      const response = await fetch(`${serverUrl}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        // Don't log 401 errors for logout (expected when session expired)
        if (!isLogoutEndpoint || response.status !== 401) {
          console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        }
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        if (!isLogoutEndpoint) {
          console.error('Non-JSON response received:', text);
        }
        throw new Error('Server returned non-JSON response');
      }
      
      return await response.json();
    } catch (error) {
      // Don't log errors for logout endpoint (expected failures)
      if (!isLogoutEndpoint) {
        console.error('❌ Request failed:', error);
      }
      throw error;
    }
  }

  // Auth endpoints
  static async login(email: string, password: string) {
    return this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  static async signup(email: string, password: string, name: string) {
    return this.makeRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    });
  }

  static async resetPassword(email: string) {
    return this.makeRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  static async updatePassword(newPassword: string, accessToken: string) {
    return this.makeRequest('/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    }, accessToken);
  }

  static async checkSession() {
    return this.makeRequest('/auth/check-session');
  }

  static async checkAdmin(accessToken: string) {
    return this.makeRequest('/auth/check-admin', {}, accessToken);
  }

  static async logout(accessToken: string | null) {
    // Silent logout - don't log unless there's a real issue
    try {
      // If no access token, still attempt logout (server will handle gracefully)
      const result = await this.makeRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          clientLogout: true
        })
      }, accessToken || undefined);
      
      return result;
    } catch (error) {
      // Silent failure - expected when session is already expired
      // Client-side cleanup is what matters
      return { 
        success: true, 
        message: 'Client-side logout completed',
        fallback: true 
      };
    }
  }

  // Exam endpoints
  static async getExamTemplates(accessToken?: string) {
    return this.makeRequest('/exam-templates', {}, accessToken);
  }

  static async startExam(templateId: string, userId: string, accessToken: string) {
    // Use GET endpoint with query parameters as server expects
    const params = new URLSearchParams({
      templateId
    });
    console.log('📡 Starting exam via ApiService with templateId:', templateId);
    
    return this.makeRequest(`/exam/start?${params.toString()}`, {
      method: 'GET'
    }, accessToken);
  }
  
  static async getExamSession(examId: string, accessToken: string) {
    return this.makeRequest(`/exam/${examId}`, {}, accessToken);
  }
  
  static async submitAnswer(sessionId: string, questionId: string, answer: number, accessToken: string) {
    console.log('Answer submitted with:', sessionId, questionId, answer);
    return this.makeRequest('/exam/answer', {
      method: 'POST',
      body: JSON.stringify({ sessionId, questionId, answer })
    }, accessToken);
  }

  static async getExamQuestions(examId: string, accessToken: string) {
    // Get exam session which includes questions
    return this.getExamSession(examId, accessToken);
  }

  static async saveExamProgress(progressData: any, accessToken: string) {
    // For now, return success - progress is saved via submitAnswer
    try {
      return { success: true, data: { message: 'Progress saved' } };
    } catch (error) {
      console.error('Error saving exam progress:', error);
      return { success: false, error: 'Failed to save progress' };
    }
  }

  static async loadExamProgress(examId: string, accessToken: string) {
    // Load progress from the exam session
    return this.getExamSession(examId, accessToken);
  }

  static async submitExam(submissionData: any, accessToken: string) {
    console.log('🚀 SUBMIT EXAM DEBUG:');
    console.log('📊 Submission data:', submissionData);
    console.log('🔑 Access token:', accessToken ? 'Present' : 'Missing');
    console.log('🎯 Target endpoint: /exam/submit');
    console.log('🌐 Full URL:', `${serverUrl}/exam/submit`);
    console.log('📦 Request body:', JSON.stringify({ sessionId: submissionData.examId }));
    
    return this.makeRequest('/exam/submit', {
      method: 'POST',
      body: JSON.stringify({ sessionId: submissionData.examId })
    }, accessToken);
  }

  // Admin endpoints
  static async getQuestionCategories(accessToken: string) {
    return this.makeRequest('/admin/question-categories', {}, accessToken);
  }

  static async createQuestionCategory(categoryData: any, accessToken: string) {
    return this.makeRequest('/admin/question-categories', {
      method: 'POST',
      body: JSON.stringify(categoryData)
    }, accessToken);
  }

  static async updateQuestionCategory(id: string, categoryData: any, accessToken: string) {
    return this.makeRequest(`/admin/question-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData)
    }, accessToken);
  }

  static async deleteQuestionCategory(id: string, accessToken: string) {
    return this.makeRequest(`/admin/question-categories/${id}`, {
      method: 'DELETE'
    }, accessToken);
  }

  static async getQuestions(accessToken: string) {
    return this.makeRequest('/admin/questions', {}, accessToken);
  }

  static async createQuestion(questionData: any, accessToken: string) {
    return this.makeRequest('/admin/questions', {
      method: 'POST',
      body: JSON.stringify(questionData)
    }, accessToken);
  }

  static async updateQuestion(id: string, questionData: any, accessToken: string) {
    return this.makeRequest(`/admin/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(questionData)
    }, accessToken);
  }

  static async deleteQuestion(id: string, accessToken: string) {
    return this.makeRequest(`/admin/questions/${id}`, {
      method: 'DELETE'
    }, accessToken);
  }

  static async getExamTemplatesAdmin(accessToken: string) {
    return this.makeRequest('/admin/exam-templates', {}, accessToken);
  }

  static async createExamTemplate(templateData: any, accessToken: string) {
    return this.makeRequest('/admin/exam-templates', {
      method: 'POST',
      body: JSON.stringify(templateData)
    }, accessToken);
  }

  static async updateExamTemplate(id: string, templateData: any, accessToken: string) {
    return this.makeRequest(`/admin/exam-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(templateData)
    }, accessToken);
  }

  static async deleteExamTemplate(id: string, accessToken: string) {
    return this.makeRequest(`/admin/exam-templates/${id}`, {
      method: 'DELETE'
    }, accessToken);
  }

  static async getResults(accessToken: string) {
    return this.makeRequest('/admin/results', {}, accessToken);
  }

  static async getUsers(accessToken: string) {
    return this.makeRequest('/admin/users', {}, accessToken);
  }

  static async getDashboardData(accessToken: string) {
    return this.makeRequest('/admin/dashboard', {}, accessToken);
  }
}