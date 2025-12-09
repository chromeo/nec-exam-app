import { Hono } from 'npm:hono';
import * as kv from './kv_store.ts';
import { Keys, KeyPatterns, generateId } from './keys.ts';
import type { 
  Question, 
  ExamTemplate, 
  ExamSession, 
  Comment, 
  CommentCategory, 
  DetailedResult, 
  KvItem, 
  BulkTemplateUpdate,
  NecEdition
} from './types.ts';

// Import shared auth utilities
import { requireAdmin, requireUser } from './auth-utils.ts';

const exams = new Hono();

/**
 * Filters questions to only those valid for the specified NEC edition.
 * Uses edition-specific metadata (category, reference) for matched questions.
 * 
 * @param questions - Array of all questions
 * @param edition - Target NEC edition (e.g., "NEC-2023")
 * @returns Filtered questions with edition-specific metadata applied
 */
function filterQuestionsByEdition(
  questions: Question[], 
  edition: NecEdition
): Question[] {
  return questions
    .filter(q => {
      // Legacy questions without editions array are considered valid for all editions
      if (!q.editions || q.editions.length === 0) {
        return true;
      }
      
      // Check if question has a valid entry for this edition
      const editionEntry = q.editions.find(ed => ed.code === edition);
      return editionEntry && editionEntry.isValid === true;
    })
    .map(q => {
      // If question has edition-specific metadata, use it
      if (q.editions && q.editions.length > 0) {
        const editionEntry = q.editions.find(ed => ed.code === edition);
        
        if (editionEntry) {
          // Return question with edition-specific category and reference
          return {
            ...q,
            category: editionEntry.category,
            reference: editionEntry.reference || q.reference
          };
        }
      }
      
      // Return question as-is (legacy or no edition-specific changes)
      return q;
    });
}

// Start new exam session (EDITION-AWARE VERSION)
exams.get('/exam/start', async (c) => {
  try {
    // Require user authentication
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireUser(accessToken);
    
    if (authResult.error) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }
    
    const templateId = c.req.query('templateId');
    if (!templateId) {
      return c.json({
        success: false,
        error: 'Template ID is required'
      }, 400);
    }
    
    // Get the template using standardized 'template:' prefix
    const template = await kv.get(Keys.template(templateId));
    if (!template) {
      return c.json({
        success: false,
        error: 'Template not found'
      }, 404);
    }
    
    // NEW: Get template edition (default to NEC-2023 if not specified)
    const templateEdition: NecEdition = template.edition || 'NEC-2023';
    console.log(`[Exam Generation] Template: ${template.title}`);
    console.log(`[Exam Generation] Edition: ${templateEdition}`);
    
    // Get all questions
    const rawQuestions = await kv.getByPrefix(KeyPatterns.allQuestions());
    
    // Parse questions
        const allQuestions = rawQuestions.map((item) => {
          let questionData: Question | null = null;
          if (typeof item.value === 'string') {
            try {
              questionData = JSON.parse(item.value);
            } catch (e) {
              console.error('❌ Failed to parse question JSON:', item.value);
              return null;
            }
          } else {
            questionData = item.value;
          }
          return {
            id: questionData?.id || item.key,
            question: questionData?.question || '',
            options: questionData?.options || [],
            correctAnswer: questionData?.correctAnswer ?? 0,
            category: questionData?.category || 'General',
            difficulty: questionData?.difficulty || 'Medium',
            reference: questionData?.reference || '',
            status: questionData?.status || 'Active',
            ...questionData
          } as Question;
        }).filter((q): q is Question => q !== null);
    
    console.log(`[Exam Generation] Total questions in database: ${allQuestions.length}`);
    
    // NEW: Filter by edition FIRST (before status filter)
    const editionFilteredQuestions = filterQuestionsByEdition(allQuestions, templateEdition);
    console.log(`[Exam Generation] Questions valid for ${templateEdition}: ${editionFilteredQuestions.length}`);
    
    // Filter by status (only Final questions, not Draft)
    const statusFilteredQuestions = editionFilteredQuestions.filter(
      (q) => q.status === 'Final' || !q.status
    );
    console.log(`[Exam Generation] Questions after status filter: ${statusFilteredQuestions.length}`);
    
    // Get question categories configuration from template
    const questionCategories = template.questionCategories || {};
    const totalQuestionsNeeded = template.questionCount || 10;
    
    // Select questions based on category requirements
    const selectedQuestions: Question[] = [];
    const categoryCounts: Record<string, number> = {};
    
    // First, fulfill category requirements (using edition-filtered questions)
    for (const [category, count] of Object.entries(questionCategories)) {
      const categoryQuestions = statusFilteredQuestions.filter((q) => q.category === category);
      const questionsToTake = Math.min(Number(count), categoryQuestions.length);
      
      // Log warning if not enough questions in category
      if (categoryQuestions.length < Number(count)) {
        console.warn(
          `[Exam Generation] Category "${category}" has only ${categoryQuestions.length} questions ` +
          `but template requires ${count} (edition: ${templateEdition})`
        );
      }
      
      // Shuffle and take required number
      const shuffled = categoryQuestions.sort(() => 0.5 - Math.random());
      const taken = shuffled.slice(0, questionsToTake);
      selectedQuestions.push(...taken);
      categoryCounts[category] = taken.length;
    }
    
    // Fill remaining slots with random questions if needed (using edition-filtered questions)
    const remainingSlots = totalQuestionsNeeded - selectedQuestions.length;
    if (remainingSlots > 0) {
      const usedIds = new Set(selectedQuestions.map((q) => q.id));
      const remainingQuestions = statusFilteredQuestions.filter((q) => !usedIds.has(q.id));
      const shuffled = remainingQuestions.sort(() => 0.5 - Math.random());
      const additional = shuffled.slice(0, remainingSlots);
      selectedQuestions.push(...additional);
    }
    
    console.log(`[Exam Generation] Final selection: ${selectedQuestions.length} questions`);
    console.log(`[Exam Generation] Category breakdown:`, categoryCounts);
    
    // Create exam session
    const sessionId = generateId();
    const examSession = {
      id: sessionId,
      userId: authResult.user?.id,
      templateId: templateId,
      templateTitle: template.title,
      questions: selectedQuestions,
      answers: {},
      startTime: new Date().toISOString(),
      timeLimit: template.timeLimit || 60,
      status: 'in_progress',
      createdAt: new Date().toISOString()
    };
    
    await kv.set(Keys.session(sessionId), { ...examSession, id: sessionId });
    
    return c.json({
      success: true,
      data: {
        sessionId: sessionId,
        questions: selectedQuestions.map((q) => ({
          id: q.id,
          question: q.question,
          options: q.options,
          category: q.category,
          reference: q.reference
        })),
        timeLimit: examSession.timeLimit,
        startTime: examSession.startTime
      }
    });
  } catch (error) {
    console.error('Error starting exam:', error);
    return c.json({
      success: false,
      error: 'Failed to start exam'
    }, 500);
  }
});

// Get exam session
exams.get('/exam/:sessionId', async (c) => {
  try {
    // Require user authentication
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireUser(accessToken);
    
    if (authResult.error) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }
    
    const sessionId = c.req.param('sessionId');
    const examSession = await kv.get(Keys.session(sessionId));
    if (!examSession) {
      return c.json({
        success: false,
        error: 'Exam session not found'
      }, 404);
    }
    // Check if user owns this session
    if (examSession.userId !== authResult.userId) {
      return c.json({
        success: false,
        error: 'Access denied'
      }, 403);
    }
    return c.json({
      success: true,
      data: examSession
    });
  } catch (error) {
    console.error('Error fetching exam session:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch exam session'
    }, 500);
  }
});

// Save answer to exam session
exams.post('/exam/answer', async (c) => {
  try {
    // Require user authentication
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireUser(accessToken);
    
    if (authResult.error) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }
    
    const { sessionId, questionId, answer } = await c.req.json();
    if (!sessionId || !questionId || answer === undefined) {
      return c.json({
        success: false,
        error: 'Missing required fields'
      }, 400);
    }
    const examSession = await kv.get(Keys.session(sessionId));
    if (!examSession) {
      return c.json({
        success: false,
        error: 'Exam session not found'
      }, 404);
    }
    // Check if user owns this session
    if (examSession.userId !== authResult.userId) {
      return c.json({
        success: false,
        error: 'Access denied'
      }, 403);
    }
    // Update the answer
    examSession.answers[questionId] = answer;
    examSession.updated_at = new Date().toISOString();
    await kv.set(Keys.session(sessionId), examSession);
    return c.json({
      success: true,
      message: 'Answer saved'
    });
  } catch (error) {
    console.error('Error saving answer:', error);
    return c.json({
      success: false,
      error: 'Failed to save answer'
    }, 500);
  }
});

// Submit exam for grading
exams.post('/exam/submit', async (c) => {
  try {
    // Require user authentication
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireUser(accessToken);
    
    if (authResult.error) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }
    
    // NEW SECURE SUBMISSION FORMAT: { examId, templateId, answers, userId, totalQuestions }
    const { examId, templateId, answers, userId, totalQuestions, questionComments, flaggedQuestions, examTitle } = await c.req.json();
    // Get all questions to calculate scores
    const rawQuestions = await kv.getByPrefix(KeyPatterns.allQuestions());
    if (!rawQuestions || rawQuestions.length === 0) {
      return c.json({
        success: false,
        error: 'No questions found in database'
      }, 500);
    }
    // Parse questions from KV store format
    const allQuestions = rawQuestions.map((item) => {
      let questionData: Question | null = null;
      if (typeof item.value === 'string') {
        try {
          questionData = JSON.parse(item.value);
        } catch (e) {
          console.error('❌ Failed to parse question JSON:', item.value);
          return null;
        }
      } else {
        questionData = item.value;
      }
      return {
        id: questionData?.id || item.key,
        question: questionData?.question || '',
        options: questionData?.options || [],
        correctAnswer: questionData?.correctAnswer ?? 0,
        category: questionData?.category || 'General',
        difficulty: questionData?.difficulty || 'Medium',
        reference: questionData?.reference || '',
        explanation: questionData?.explanation,
        status: questionData?.status || 'Final',
        createdAt: questionData?.createdAt || questionData?.created_at || new Date().toISOString(),
        updatedAt: questionData?.updatedAt || questionData?.updated_at,
        created_by: questionData?.created_by,
        updated_by: questionData?.updated_by,
      } as Question;
    }).filter(Boolean);

    // Simple approach: Look up each answered question by ID
    let correctAnswers = 0;
    const detailedResults: DetailedResult[] = [];
    Object.keys(answers).forEach(questionId => {
      const userAnswer = answers[questionId];
      // Find the question in our database
      const question = allQuestions.find((q) => q.id === questionId);
      if (!question) {
        console.warn(`❌ Server: Question not found for ID: ${questionId}`);
        detailedResults.push({
          questionId: questionId,
          question: 'Question not found',
          userAnswer: userAnswer,
          correctAnswer: null,
          isCorrect: false,
          category: 'Unknown',
          codeReference: undefined
        });
        return;
      }
      const userAnswerIndex = parseInt(userAnswer);
      const correctAnswerIndex: number = question.correctAnswer ?? 0;
      const isCorrect = userAnswerIndex === correctAnswerIndex;
      if (isCorrect) {
        correctAnswers++;
      }
      detailedResults.push({
        questionId: question.id,
        question: question.question || 'Question text not available',
        userAnswer: userAnswerIndex,
        correctAnswer: correctAnswerIndex,
        isCorrect,
        category: question.category,
        codeReference: question.reference
      });
    });
    // Calculate score as percentage based on TOTAL questions, not just answered ones
    const totalAnswered = Object.keys(answers).length;
    const score = totalQuestions > 0 ? Math.round(correctAnswers / totalQuestions * 100) : 0;
    
    // 🆕 Create standalone comments from questionComments (Clean Architecture)
    if (questionComments && Object.keys(questionComments).length > 0) {
      console.log(`📝 Creating ${Object.keys(questionComments).length} standalone comments for exam ${examId}`);
      
      for (const [questionId, commentData] of Object.entries(questionComments)) {
        // Handle both old string format and new object format
        let commentText: string;
        let category: CommentCategory;
        
        if (typeof commentData === 'string') {
          // Legacy format - plain string
          commentText = commentData;
          category = 'Uncategorized';
        } else if (commentData && typeof commentData === 'object' && 'text' in commentData) {
          // New format - object with text and category
          commentText = String(commentData.text);
          // Type-safe category access
          category = (
            commentData && 
            typeof commentData === 'object' && 
            'category' in commentData && 
            typeof commentData.category === 'string'
              ? commentData.category as CommentCategory
              : 'Uncategorized'
          );
        } else {
          console.log(`⚠️ Skipping invalid comment data for question ${questionId}:`, commentData);
          continue;
        }
        
        if (!commentText || !commentText.trim()) {
          continue; // Skip empty comments
        }
        
        // Generate comment ID in timestamp-random format
        const commentId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        
        // Create standalone comment object
        const comment: Comment = {
          id: commentId,
          examId: examId,
          questionId: questionId.replace('question:', ''), // Clean prefix if present
          userId: userId,
          content: commentText.trim(),
          category: category,
          disposition: 'Under Review', // Auto-flag for admin review
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          responses: [],
          metadata: {
            context: 'during_exam',
            examTitle: examTitle || 'Unknown Exam'
          }
        };
        
        // Store in multiple index keys for efficient querying
        // ✅ Handle nullable questionId - only add question index if questionId exists
        const keysToSet = [
          Keys.comment(commentId),
          Keys.commentsByCategory(comment.category, commentId),
          Keys.commentsByDisposition(comment.disposition, commentId),
          Keys.commentsByUser(userId, commentId),
          Keys.commentsByExam(examId, commentId)
        ];
        
        const valuesToSet = [
          comment,
          comment,
          comment,
          comment,
          comment
        ];
        
        // Add question index only if questionId is not null
        if (comment.questionId) {
          keysToSet.push(Keys.commentsByQuestion(comment.questionId, commentId));
          valuesToSet.push(comment);
        }
        
        await kv.mset(keysToSet, valuesToSet);
        console.log(`✅ Created standalone comment ${commentId} for question ${comment.questionId}`);
      }
    }
    
    // Store exam results (WITHOUT embedded comments - clean architecture)
    const examResult = {
      examId,
      templateId,
      userId,
      totalQuestions: totalQuestions,
      answeredQuestions: totalAnswered,
      correctAnswers,
      score,
      completedAt: new Date().toISOString(),
      answers,
      detailedResults,
      flaggedQuestions: flaggedQuestions || {},
      examTitle: examTitle || null
      // ❌ No questionComments field - comments are now standalone entities
    };
    // Save result to KV store for admin review
    await kv.set(Keys.result(examId), examResult);
    
    // 🧹 CLEANUP: Delete the session now that it's converted to a result
    // Try both new and old session key formats
    const sessionKey = Keys.session(examId);
    const oldSessionKey = `exam-session:${examId}`;
    
    try {
      await kv.del(sessionKey);
      console.log(`✅ Deleted session: ${sessionKey}`);
    } catch (e) {
      console.warn(`⚠️ Could not delete session ${sessionKey}:`, e);
    }
    
    try {
      await kv.del(oldSessionKey);
      console.log(`✅ Deleted old session: ${oldSessionKey}`);
    } catch (e) {
      // Ignore - old format may not exist
    }
    
    const response = {
      success: true,
      data: {
        examId,
        templateId,
        totalQuestions: totalQuestions,
        answeredQuestions: totalAnswered,
        correctAnswers,
        score,
        completedAt: new Date().toISOString(),
        detailedResults
      }
    };
    return c.json(response);
  } catch (error) {
    console.error('💥 Server: Error submitting exam:', error);
    return c.json({
      success: false,
      error: `Failed to submit exam: ${error instanceof Error ? error.message : String(error)}`
    }, 500);
  }
});

// ============================================================================
// EXAM TEMPLATES - PUBLIC ENDPOINT (Edition field included in response)
// ============================================================================

exams.get('/exam-templates', async (c) => {
  try {
    const rawTemplates = await kv.getByPrefix(KeyPatterns.allTemplates());
    const processedTemplates = rawTemplates.map((item: KvItem) => {
      // Handle both object and string formats
      let templateData: ExamTemplate | null = null;
      if (typeof item.value === 'string') {
        try {
          templateData = JSON.parse(item.value);
        } catch (e) {
          console.error('❌ Failed to parse template JSON:', item.value);
          return null;
        }
      } else {
        templateData = item.value;
      }
      return templateData;
    }).filter(Boolean) as ExamTemplate[];
    const publicTemplates = processedTemplates.filter((template) => {
      const isNotDraft = template && !template.isDraft;
      return isNotDraft;
    }).map((template: ExamTemplate) => {
      return {
        id: template.id,
        title: template.title,
        description: template.description,
        timeLimit: template.timeLimit || 60,
        questionCount: template.questionCount || 10,
        passingPercentage: template.passingPercentage || 70,
        moreDetails: template.moreDetails || '',
        price: template.price || 0,
        displayOrder: template.displayOrder || 0,
        edition: template.edition || 'NEC-2023'
      };
    });
    return c.json({
      success: true,
      data: publicTemplates
    });
  } catch (error) {
    console.error('💥 Error fetching exam templates:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch exam templates'
    }, 500);
  }
});

// ============================================================================
// ADMIN EXAM TEMPLATES ENDPOINTS (Edition field handled)
// ============================================================================

// Get all templates (admin)
exams.get('/admin/exam-templates', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }
    const rawTemplates = await kv.getByPrefix(KeyPatterns.allTemplates());
    // Parse and transform templates to match frontend expectations
    const parsedTemplates = rawTemplates.map((item) => {
      let templateData: ExamTemplate | null = null;
      if (typeof item.value === 'string') {
        try {
          templateData = JSON.parse(item.value);
        } catch (e) {
          console.error('❌ Failed to parse template JSON:', item.value);
          return null;
        }
      } else {
        templateData = item.value;
      }
      // Return clean camelCase format
      return {
        id: templateData?.id || item.key,
        title: templateData?.title || 'Untitled',
        description: templateData?.description || '',
        timeLimit: templateData?.timeLimit || 60,
        questionCount: templateData?.questionCount || 10,
        passingPercentage: templateData?.passingPercentage || 70,
        questionCategories: templateData?.questionCategories || {},
        templateName: templateData?.templateName || '',
        isDraft: templateData?.isDraft ?? false,
        createdAt: templateData?.createdAt || new Date().toISOString(),
        updatedAt: templateData?.updatedAt,
        createdBy: templateData?.createdBy,
        updatedBy: templateData?.updatedBy,
        moreDetails: templateData?.moreDetails || '',
        price: templateData?.price || 0,
        displayOrder: templateData?.displayOrder || 0,
        edition: templateData?.edition || 'NEC-2023'
      };
    }).filter(Boolean);
    return c.json({
      success: true,
      data: parsedTemplates
    });
  } catch (error) {
    console.error('Error fetching admin exam templates:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch exam templates'
    }, 500);
  }
});

// Create template (admin) - Edition field included
exams.post('/admin/exam-templates', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }
    const templateData = await c.req.json();
    const templateId = generateId();
    const template: ExamTemplate = {
      id: templateId,
      title: templateData.title,
      description: templateData.description,
      timeLimit: templateData.timeLimit || 60,
      questionCount: templateData.questionCount || 10,
      passingPercentage: templateData.passingPercentage || 70,
      questionCategories: templateData.questionCategories || {},
      templateName: templateData.templateName || '',
      isDraft: templateData.isDraft ?? false,
      createdAt: new Date().toISOString(),
      createdBy: authResult.user?.id,
      moreDetails: templateData.moreDetails || '',
      price: templateData.price || 0,
      displayOrder: templateData.displayOrder || 0,
      edition: templateData.edition || 'NEC-2023'
    };
    await kv.set(Keys.template(templateId), template);
    return c.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error creating exam template:', error);
    return c.json({
      success: false,
      error: 'Failed to create exam template'
    }, 500);
  }
});

// Update template (admin) - Edition field preserved
exams.put('/admin/exam-templates/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }
    const templateId = c.req.param('id');
    const cleanTemplateId = templateId.split(':').pop() || templateId;
    const existingTemplate = await kv.get(Keys.template(cleanTemplateId));
    if (!existingTemplate) {
      return c.json({
        success: false,
        error: 'Template not found'
      }, 404);
    }
    const updateData = await c.req.json();
    const updatedTemplate: ExamTemplate = {
      ...existingTemplate,
      ...updateData,
      id: cleanTemplateId,
      updatedAt: new Date().toISOString(),
      updatedBy: authResult.user?.id
    };
    await kv.set(Keys.template(cleanTemplateId), updatedTemplate);
    return c.json({
      success: true,
      data: updatedTemplate
    });
  } catch (error) {
    console.error('Error updating exam template:', error);
    return c.json({
      success: false,
      error: 'Failed to update exam template'
    }, 500);
  }
});

// Delete template (admin)
exams.delete('/admin/exam-templates/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }
    const templateId = c.req.param('id');
    const cleanTemplateId = templateId.split(':').pop() || templateId;
    await kv.del(Keys.template(cleanTemplateId));
    return c.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting exam template:', error);
    return c.json({
      success: false,
      error: 'Failed to delete exam template'
    }, 500);
  }
});

// Clone template (admin) - Edition field copied
exams.post('/admin/exam-templates/:id/clone', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }
    const sourceId = c.req.param('id');
    const cleanSourceId = sourceId.split(':').pop() || sourceId;
    const sourceTemplate = await kv.get(Keys.template(cleanSourceId));
    if (!sourceTemplate) {
      return c.json({
        success: false,
        error: 'Source template not found'
      }, 404);
    }
    const newId = generateId();
    const clonedTemplate: ExamTemplate = {
      ...sourceTemplate,
      id: newId,
      title: `${sourceTemplate.title} (Copy)`,
      createdAt: new Date().toISOString(),
      createdBy: authResult.user?.id,
      updatedAt: undefined,
      updatedBy: undefined
    };
    await kv.set(Keys.template(newId), clonedTemplate);
    return c.json({
      success: true,
      data: clonedTemplate
    });
  } catch (error) {
    console.error('Error cloning exam template:', error);
    return c.json({
      success: false,
      error: 'Failed to clone exam template'
    }, 500);
  }
});

// Reorder templates (admin) - BULK UPDATE
exams.post('/admin/exam-templates/reorder', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const body = await c.req.json();
    
    // Support both old (single) and new (bulk) formats
    if (body.templateId && body.newOrder !== undefined) {
      // OLD FORMAT: Single template update (backward compatibility)
      const { templateId, newOrder } = body;
      const cleanTemplateId = templateId.split(':').pop() || templateId;
      const template = await kv.get(Keys.template(cleanTemplateId));
      
      if (!template) {
        return c.json({
          success: false,
          error: 'Template not found'
        }, 404);
      }
      
      const updatedTemplate = {
        ...template,
        displayOrder: newOrder,
        updatedAt: new Date().toISOString(),
        updatedBy: authResult.user?.id
      };
      
      await kv.set(Keys.template(cleanTemplateId), updatedTemplate);
      
      return c.json({
        success: true,
        data: updatedTemplate
      });
      
    } else if (body.templates && Array.isArray(body.templates)) {
      // NEW FORMAT: Bulk template update
      const { templates } = body;
      
      if (templates.length === 0) {
        return c.json({
          success: false,
          error: 'No templates provided'
        }, 400);
      }
      
      // Validate all templates have required fields
      for (const t of templates) {
        if (!t.id || t.display_order === undefined) {
          return c.json({
            success: false,
            error: 'Each template must have id and display_order'
          }, 400);
        }
      }
      
      const updatePromises: Promise<ExamTemplate | null>[] = templates.map(async (templateUpdate: BulkTemplateUpdate) => {
        const cleanId: string = templateUpdate.id.split(':').pop() || templateUpdate.id;
        const template = await kv.get(Keys.template(cleanId)) as ExamTemplate | null;
        
        if (!template) {
          console.warn(`⚠️ Template not found during reorder: ${cleanId}`);
          return null;
        }
        
        const updatedTemplate: ExamTemplate = {
          ...template,
          displayOrder: templateUpdate.display_order,
          updatedAt: new Date().toISOString(),
          updatedBy: authResult.user?.id
        };
        
        await kv.set(Keys.template(cleanId), updatedTemplate);
        return updatedTemplate;
      });
      
      const results = await Promise.all(updatePromises);
      const successCount = results.filter(r => r !== null).length;
      
      console.log(`✅ Bulk reorder complete: ${successCount}/${templates.length} templates updated`);
      
      return c.json({
        success: true,
        data: {
          updated: successCount,
          total: templates.length
        }
      });
      
    } else {
      // Invalid format
      return c.json({
        success: false,
        error: 'Missing required fields: expected either { templateId, newOrder } or { templates: [...] }'
      }, 400);
    }
    
  } catch (error) {
    console.error('❌ Error reordering exam template(s):', error);
    return c.json({
      success: false,
      error: 'Failed to reorder exam template(s)'
    }, 500);
  }
});
export default exams;