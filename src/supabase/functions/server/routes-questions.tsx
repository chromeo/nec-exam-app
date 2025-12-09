import { Hono } from 'npm:hono';
import * as kv from './kv_store.ts';
import { Keys, KeyPatterns, KeyUtils, generateId } from './keys.ts';
import type { Question, QuestionForm, Comment, UserFeedback, KvItem, AuthResult } from './types.ts';
import { requireAdmin, supabase, supabaseForAuth } from './auth-utils.ts';

const questions = new Hono();  // ✅ Changed from 'app' to 'questions' for consistency

// Read all questions endpoint
questions.get('/admin/questions', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);

    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const rawQuestions = await kv.getByPrefix(KeyPatterns.allQuestions());
    
    // Parse and filter questions by category
    const parsedQuestions = rawQuestions.map((item: KvItem) => {
      // Handle both object and string formats
      let questionData: Question | null = null;
      if (typeof item.value === 'string') {
        try {
          questionData = JSON.parse(item.value);
        } catch (e) {
          console.error('Error parsing question JSON:', e);
          return null;
        }
      } else {
        questionData = item.value;
      }

      if (!questionData) {
        return null;
      }

      return {
        id: KeyUtils.extractId(item.key),
        status: questionData?.status || 'Draft',
        ...questionData
      };
    }).filter(Boolean); // Remove any null values

    return c.json({
      success: true,
      data: parsedQuestions
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch questions'
    }, 500);
  }
});

// Create question endpoint
questions.post('/admin/questions', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);

    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const questionData = await c.req.json();
    const questionId = generateId();
    await kv.set(Keys.question(questionId), { 
      ...questionData,
      id: questionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return c.json({
      success: true,
      data: { id: questionId, ...questionData }
    });
  } catch (error) {
    console.error('Error creating question:', error);
    return c.json({
      success: false,
      error: 'Failed to create question'
    }, 500);
  }
});

// Single Question GET endpoint
questions.get('/admin/questions/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);

    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const questionId = c.req.param('id');
    
    // Try direct lookup first
    let questionData = await kv.get(Keys.question(questionId));
    
    if (!questionData) {
      return c.json({
        success: false,
        error: 'Question not found'
      }, 404);
    }

    // Handle string parsing if needed
    if (typeof questionData === 'string') {
      try {
        questionData = JSON.parse(questionData);
      } catch (e) {
        console.error('Error parsing question JSON:', e);
        return c.json({
          success: false,
          error: 'Invalid question data format'
        }, 500);
      }
    }
    
    return c.json({
      success: true,
      data: {
        id: questionId,
        ...questionData
      }
    });
  } catch (error) {
    console.error('Error fetching question:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch question'
    }, 500);
  }
});

// Update question endpoint
questions.put('/admin/questions/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);

    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const questionId = c.req.param('id');
    const updateData = await c.req.json();
    
    // Get existing question first
    const existingQuestion = await kv.get(Keys.question(questionId));
    if (!existingQuestion) {
      return c.json({
        success: false,
        error: 'Question not found'
      }, 404);
    }

    // Parse existing data if it's a string
    let existingData = existingQuestion;
    if (typeof existingQuestion === 'string') {
      existingData = JSON.parse(existingQuestion);
    }

    // Merge with updates
    const updatedQuestion = {
      ...existingData,
      ...updateData,
      id: questionId,
      updatedAt: new Date().toISOString()
    };

    await kv.set(Keys.question(questionId), updatedQuestion);

    return c.json({
      success: true,
      data: updatedQuestion
    });
  } catch (error) {
    console.error('Error updating question:', error);
    return c.json({
      success: false,
      error: 'Failed to update question'
    }, 500);
  }
});

// Delete question endpoint  
questions.delete('/admin/questions/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);

    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const questionId = c.req.param('id');
    
    // Check if question exists
    const existingQuestion = await kv.get(Keys.question(questionId));
    if (!existingQuestion) {
      return c.json({
        success: false,
        error: 'Question not found'
      }, 404);
    }

    await kv.del(Keys.question(questionId));

    return c.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    return c.json({
      success: false,
      error: 'Failed to delete question'
    }, 500);
  }
});

// Bulk import questions endpoint
questions.post('/admin/questions/import', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);

    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const { questions: questionsData, overwrite = false } = await c.req.json();
    
    if (!Array.isArray(questionsData)) {
      return c.json({
        success: false,
        error: 'Questions must be an array'
      }, 400);
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const questionData of questionsData) {
      try {
        // Validate required fields
        if (!questionData.question || !questionData.options || !Array.isArray(questionData.options) || 
            typeof questionData.correctAnswer !== 'number' || !questionData.category) {
          errors.push(`Invalid question format: ${questionData.question?.substring(0, 50) || 'Unknown'}`);
          continue;
        }

        // Generate or use existing ID
        const questionId = questionData.id || generateId();
        
        // Check if question already exists (unless overwriting)
        if (!overwrite) {
          const existingQuestion = await kv.get(Keys.question(questionId));
          if (existingQuestion) {
            skippedCount++;
            continue;
          }
        }

        // Import question with Draft status for admin review
        await kv.set(Keys.question(questionId), {
          ...questionData,
          id: questionId,
          status: 'Draft', // All imported questions start as Draft
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        importedCount++;
      } catch (error) {
        errors.push(`Error importing question: ${error.message}`);
      }
    }

    return c.json({
      success: true,
      data: {
        importedCount,
        skippedCount,
        totalProcessed: questionsData.length,
        message: `Successfully imported ${importedCount} questions as Draft status (requires admin review)`,
        errors: errors.slice(0, 10) // Limit errors to first 10
      }
    });
  } catch (error) {
    console.error('Error importing questions:', error);
    return c.json({
      success: false,
      error: 'Failed to import questions'
    }, 500);
  }
});

// Get all comments for a specific question
questions.get('/admin/questions/:id/comments', async (c) => {
  try {
    const questionId = c.req.param('id');
    console.log(`📊 GET /admin/questions/${questionId}/comments - Fetching comments for question`);
    
    // Require admin authentication
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    // Combine both during-exam comments AND after-exam feedback
    const allComments: (Comment | UserFeedback)[] = [];
    
    // 1. Get during-exam comments (Comment type)
    const commentPrefix = KeyPatterns.allCommentsForQuestion(questionId);
    const commentIndices = await kv.getByPrefix(commentPrefix);
    
    console.log(`📊 Found ${commentIndices.length} during-exam comment indices for question ${questionId}`);
    
    for (const index of commentIndices) {
      // Index contains: { commentId, createdAt }
      const commentId = index.value?.commentId || index.commentId;
      if (!commentId) {
        console.warn('⚠️ Comment index entry missing commentId:', index);
        continue;
      }
      
      const comment = await kv.get(Keys.comment(commentId));
      if (comment) {
        allComments.push({
          ...comment,
          context: 'during_exam', // Ensure context is set
          needs_attention: comment.disposition === 'Needs Attention'
        });
      } else {
        console.warn(`⚠️ Comment not found for ID: ${commentId}`);
      }
    }
    
    // 2. Get after-exam feedback (UserFeedback type)
    const feedbackPrefix = KeyPatterns.allUserFeedbackByQuestion(questionId);
    const feedbackIndices = await kv.getByPrefix(feedbackPrefix);
    
    console.log(`📊 Found ${feedbackIndices.length} after-exam feedback indices for question ${questionId}`);
    
    for (const index of feedbackIndices) {
      // Index contains: { feedbackId, createdAt }
      const feedbackId = index.value?.feedbackId || index.feedbackId;
      if (!feedbackId) {
        console.warn('⚠️ Feedback index entry missing feedbackId:', index);
        continue;
      }
      
      const feedback = await kv.get(Keys.userFeedback(feedbackId));
      if (feedback) {
        allComments.push({
          ...feedback,
          context: 'after_exam', // Ensure context is set
          needs_attention: feedback.status === 'pending'
        });
      } else {
        console.warn(`⚠️ Feedback not found for ID: ${feedbackId}`);
      }
    }
    
    // Sort by createdAt (newest first)
    allComments.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    console.log(`✅ Returning ${allComments.length} total comments for question ${questionId}`);

    return c.json({
      success: true,
      data: allComments
    });

  } catch (error) {
    console.error('❌ Error fetching question comments:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch question comments'
    }, 500);
  }
});

// Test endpoint to verify routing works (keep for now)
questions.get('/test/questions', (c) => {
  return c.json({ 
    success: true, 
    message: 'Questions route is working!',
    route: 'routes-questions.tsx',
    endpoints: [
      'GET /admin/questions',
      'POST /admin/questions',
      'GET /admin/questions/:id',
      'PUT /admin/questions/:id',
      'DELETE /admin/questions/:id',
      'POST /admin/questions/import',
      'GET /admin/questions/:id/comments'
    ]
  });
});

export default questions;