// Type consistency utilities for manual validation
// These tools help ensure frontend types match backend implementation and validation schemas

import { z } from 'zod';
import type { 
  Comment, 
  ExamResult, 
  User, 
  Question, 
  ExamTemplate,
  CreateCommentRequest,
  UpdateCommentRequest,
  QuestionForm,
  TemplateForm,
  CreateExamResultRequest,
  UpdateAnswerRequest,
  ApiResponse 
} from '../supabase/functions/server/types';

import {
  CommentSchema,
  AnswerSchema,
  ExamResultSchema,
  UserSchema,
  QuestionSchema,
  ExamTemplateSchema,
  CreateCommentRequestSchema,
  UpdateCommentRequestSchema,
  QuestionFormSchema,
  TemplateFormSchema,
  CreateExamResultRequestSchema,
  UpdateAnswerRequestSchema,
  ApiResponseSchema,
  safeValidate
} from '../schemas/api-validation';

// Debug: Check if all imports are available
console.log('🔍 Schema imports check:', {
  CommentSchema: !!CommentSchema,
  AnswerSchema: !!AnswerSchema,
  ExamResultSchema: !!ExamResultSchema,
  UserSchema: !!UserSchema,
  QuestionSchema: !!QuestionSchema,
  ExamTemplateSchema: !!ExamTemplateSchema,
  safeValidate: !!safeValidate
});

// =============================================================================
// TYPE CONSISTENCY VALIDATION
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  typeChecks: Array<{
    typeName: string;
    status: 'pass' | 'fail' | 'warning';
    details: string;
  }>;
}

export interface ApiEndpointTest {
  endpoint: string;
  method: string;
  status: 'pass' | 'fail' | 'error';
  responseTime?: number;
  error?: string;
  data?: any;
}

export class TypeConsistencyValidator {
  private results: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    typeChecks: []
  };

  // Test sample data against schemas
  validateSampleData(): ValidationResult {
    console.log('🧪 Starting type validation...');
    
    this.results = {
      isValid: true,
      errors: [],
      warnings: [],
      typeChecks: []
    };

    try {
      // Test Comment type consistency
      this.testCommentType();
      
      // Test ExamResult type consistency
      this.testExamResultType();
      
      // Test User type consistency
      this.testUserType();
      
      // Test Question type consistency
      this.testQuestionType();
      
      // Test ExamTemplate type consistency
      this.testExamTemplateType();
      
      // Test request/response types
      this.testRequestTypes();

      console.log('✅ Type validation completed successfully');
    } catch (error) {
      console.error('❌ Type validation failed:', error);
      this.results.isValid = false;
      this.results.errors.push(`Validation process error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return this.results;
  }

  private addCheck(typeName: string, status: 'pass' | 'fail' | 'warning', details: string) {
    this.results.typeChecks.push({ typeName, status, details });
    
    if (status === 'fail') {
      this.results.isValid = false;
      this.results.errors.push(`${typeName}: ${details}`);
    } else if (status === 'warning') {
      this.results.warnings.push(`${typeName}: ${details}`);
    }
  }

  private testCommentType() {
    try {
      console.log('🧪 Testing Comment type...');
      const sampleComment: Comment = {
        id: 'test-comment-123',
        examId: 'exam-1759125983686-8f2c7b6e', 
        questionId: 'demo-456',
        userId: '8f2c7b6e-f31c-4827-bf87-7156591a53e6',
        content: 'This is a test comment',
        category: 'Question Clarity',
        disposition: 'Under Review',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        responses: [],
        userEmail: 'test@example.com',
        userName: 'Test User'
      };

      console.log('🧪 Sample comment data:', sampleComment);
      console.log('🧪 CommentSchema available:', !!CommentSchema);

      const validation = safeValidate(CommentSchema, sampleComment);
      if (validation.success) {
        this.addCheck('Comment', 'pass', 'Type structure matches schema');
      } else {
        this.addCheck('Comment', 'fail', `Schema mismatch: ${validation.error}`);
      }
    } catch (error) {
      console.error('❌ Error in testCommentType:', error);
      this.addCheck('Comment', 'fail', `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private testExamResultType() {
    try {
      console.log('🧪 Testing ExamResult type...');
      const sampleExamResult: ExamResult = {
        id: 'result-exam-123-user-456',
        examId: 'exam-123',
        userId: 'user-456',
        templateId: 'template-789',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        answers: {
          'q1': {
            questionId: 'q1',
            selectedAnswers: ['a1'],
            correctAnswers: ['a1'],
            isCorrect: true,
            timeSpent: 30,
            flagged: false,
            answeredAt: new Date().toISOString()
          }
        },
        score: 85,
        totalQuestions: 10,
        correctAnswers: 8,
        status: 'completed',
        timeSpent: 1800
      };

      console.log('🧪 Sample ExamResult data:', sampleExamResult);
      console.log('🧪 ExamResultSchema available:', !!ExamResultSchema);
      console.log('🧪 AnswerSchema available:', !!AnswerSchema);

      const validation = safeValidate(ExamResultSchema, sampleExamResult);
      if (validation.success) {
        this.addCheck('ExamResult', 'pass', 'Type structure matches schema');
      } else {
        console.error('❌ ExamResult validation failed:', validation.error);
        this.addCheck('ExamResult', 'fail', `Schema mismatch: ${validation.error}`);
      }
    } catch (error) {
      console.error('❌ Error in testExamResultType:', error);
      this.addCheck('ExamResult', 'fail', `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private testUserType() {
    const sampleUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      createdAt: new Date().toISOString()
    };

    const validation = safeValidate(UserSchema, sampleUser);
    if (validation.success) {
      this.addCheck('User', 'pass', 'Type structure matches schema');
    } else {
      this.addCheck('User', 'fail', `Schema mismatch: ${validation.error}`);
    }
  }

  private testQuestionType() {
    // ✅ Use CORRECT format matching database
    const sampleQuestion: Question = {
      id: 'q-123',
      question: 'What is the meaning of life?',  // ✅ Correct field
      category: 'Philosophy',
      options: ['42', 'Love', 'Knowledge', 'Power'],  // ✅ Simple string array
      correctAnswer: 0,                           // ✅ Number index (0-3)
      explanation: 'According to Douglas Adams',
      reference: 'Hitchhiker\'s Guide',
      difficulty: 'Medium',
      status: 'Final',
      createdAt: new Date().toISOString()
    };

    const validation = safeValidate(QuestionSchema, sampleQuestion);
    if (validation.success) {
      this.addCheck('Question', 'pass', 'Type structure matches schema');
    } else {
      this.addCheck('Question', 'fail', `Schema mismatch: ${validation.error}`);
    }
  }

  private testExamTemplateType() {
    const sampleTemplate: ExamTemplate = {
      id: 'template-123',
      title: 'Sample Exam',
      description: 'A test exam template',
      timeLimit: 60,
      questionCount: 10,
      categories: ['Philosophy', 'Science'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      moreDetails: 'Additional information',
      price: 29.99
    };

    const validation = safeValidate(ExamTemplateSchema, sampleTemplate);
    if (validation.success) {
      this.addCheck('ExamTemplate', 'pass', 'Type structure matches schema');
    } else {
      this.addCheck('ExamTemplate', 'fail', `Schema mismatch: ${validation.error}`);
    }
  }

  private testRequestTypes() {
    // Test CreateCommentRequest
    const createCommentRequest: CreateCommentRequest = {
      examId: 'exam-123',
      questionId: 'q-456',
      content: 'Test comment',
      category: 'Question Clarity'
    };

    let validation = safeValidate(CreateCommentRequestSchema, createCommentRequest);
    if (validation.success) {
      this.addCheck('CreateCommentRequest', 'pass', 'Request type matches schema');
    } else {
      this.addCheck('CreateCommentRequest', 'fail', `Schema mismatch: ${validation.error}`);
    }

    // Test UpdateCommentRequest
    const updateCommentRequest: UpdateCommentRequest = {
      disposition: 'Resolved',
      response: {
        content: 'Thank you for the feedback',
        adminUserId: 'admin-123'
      }
    };

    validation = safeValidate(UpdateCommentRequestSchema, updateCommentRequest);
    if (validation.success) {
      this.addCheck('UpdateCommentRequest', 'pass', 'Request type matches schema');
    } else {
      this.addCheck('UpdateCommentRequest', 'fail', `Schema mismatch: ${validation.error}`);
    }

    // Test QuestionForm
    const questionForm: QuestionForm = {
      question: 'What is 2+2?',
      options: ['3', '4', '5', '6'],
      correctAnswer: 1,
      category: 'Math',
      difficulty: 'Easy',
      status: 'Final'
    };

    validation = safeValidate(QuestionFormSchema, questionForm);
    if (validation.success) {
      this.addCheck('QuestionForm', 'pass', 'Form type matches schema');
    } else {
      this.addCheck('QuestionForm', 'fail', `Schema mismatch: ${validation.error}`);
    }
  }
}

// =============================================================================
// API CONTRACT TESTING
// =============================================================================

export class ApiContractTester {
  private baseUrl: string;
  private accessToken: string;

  constructor(baseUrl: string, accessToken: string) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
  }

  async testAllEndpoints(): Promise<ApiEndpointTest[]> {
    const tests: ApiEndpointTest[] = [];

    // Test health check endpoint (public)
    tests.push(await this.testEndpoint('GET', '/health'));

    // Test critical user-facing endpoints
    if (this.accessToken) {
      // User exam flow - most critical for exam takers
      tests.push(await this.testEndpoint('GET', '/exam-templates')); // Can users see available exams?
      tests.push(await this.testEndpoint('GET', '/auth/check-admin')); // Auth verification
      
      // Admin management endpoints
      tests.push(await this.testEndpoint('GET', '/admin/questions'));
      tests.push(await this.testEndpoint('GET', '/admin/exam-templates'));
      tests.push(await this.testEndpoint('GET', '/admin/results'));
      tests.push(await this.testEndpoint('GET', '/admin/comments'));
      tests.push(await this.testEndpoint('GET', '/admin/question-categories'));
    }

    return tests;
  }

  private async testEndpoint(method: string, endpoint: string, body?: any): Promise<ApiEndpointTest> {
    const startTime = Date.now();
    const fullUrl = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(fullUrl, {
        method,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        
        // Validate response structure
        const apiValidation = safeValidate(ApiResponseSchema, data);
        
        return {
          endpoint: `${method} ${endpoint}`,
          method,
          status: apiValidation.success ? 'pass' : 'fail',
          responseTime,
          data: apiValidation.success ? data : undefined,
          error: apiValidation.success ? undefined : `Response structure invalid: ${apiValidation.error}`
        };
      } else {
        return {
          endpoint: `${method} ${endpoint}`,
          method,
          status: 'fail',
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        endpoint: `${method} ${endpoint}`,
        method,
        status: 'error',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async testResponseContract(endpoint: string, expectedSchema: any): Promise<{ isValid: boolean; error?: string; data?: any }> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        return { isValid: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      const validation = safeValidate(expectedSchema, data);

      if (validation.success) {
        return { isValid: true, data: validation.data };
      } else {
        return { isValid: false, error: validation.error };
      }
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export const generateValidationReport = (validationResult: ValidationResult): string => {
  const lines: string[] = [];
  
  lines.push('# Type Consistency Validation Report');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  
  lines.push(`## Summary`);
  lines.push(`Overall Status: ${validationResult.isValid ? '✅ PASS' : '❌ FAIL'}`);
  lines.push(`Total Checks: ${validationResult.typeChecks.length}`);
  lines.push(`Errors: ${validationResult.errors.length}`);
  lines.push(`Warnings: ${validationResult.warnings.length}`);
  lines.push('');
  
  if (validationResult.errors.length > 0) {
    lines.push('## ❌ Errors');
    validationResult.errors.forEach(error => lines.push(`- ${error}`));
    lines.push('');
  }
  
  if (validationResult.warnings.length > 0) {
    lines.push('## ⚠️ Warnings');
    validationResult.warnings.forEach(warning => lines.push(`- ${warning}`));
    lines.push('');
  }
  
  lines.push('## 📋 Detailed Results');
  validationResult.typeChecks.forEach(check => {
    const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️';
    lines.push(`${icon} **${check.typeName}**: ${check.details}`);
  });
  
  return lines.join('\n');
};

export const generateApiTestReport = (tests: ApiEndpointTest[]): string => {
  const lines: string[] = [];
  
  lines.push('# API Contract Test Report');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  
  const passCount = tests.filter(t => t.status === 'pass').length;
  const failCount = tests.filter(t => t.status === 'fail').length;
  const errorCount = tests.filter(t => t.status === 'error').length;
  
  lines.push(`## Summary`);
  lines.push(`Total Endpoints: ${tests.length}`);
  lines.push(`✅ Pass: ${passCount}`);
  lines.push(`❌ Fail: ${failCount}`);
  lines.push(`💥 Error: ${errorCount}`);
  lines.push('');
  
  lines.push('## 📋 Test Results');
  tests.forEach(test => {
    const icon = test.status === 'pass' ? '✅' : test.status === 'fail' ? '❌' : '💥';
    lines.push(`${icon} **${test.endpoint}** (${test.responseTime}ms)`);
    if (test.error) {
      lines.push(`   Error: ${test.error}`);
    }
  });
  
  return lines.join('\n');
};

// Export singleton instances for easy use
export const typeValidator = new TypeConsistencyValidator();
export const createApiTester = (baseUrl: string, accessToken: string) => 
  new ApiContractTester(baseUrl, accessToken);