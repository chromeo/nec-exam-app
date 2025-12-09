import { Hono } from 'npm:hono';
import * as kv from './kv_store.ts';
import { Keys, KeyPatterns, generateId } from './keys.ts';
import type { 
  AuthResult, 
  Comment, 
  CommentCategory, 
  CommentDisposition,
  Question,
  KvItem,
  EnrichedUser,
  UserProfile
} from './types.ts';

// Import shared auth utilities
import { supabase, requireAdmin } from './auth-utils.ts';

const comments = new Hono();

console.log('📝 routes-comments.ts module loaded');

// ========================================
// COMMENT CRUD ENDPOINTS
// ========================================

comments.get('/admin/comments', async (c) => {
  try {
    
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    // Parse query parameters
    const url = new URL(c.req.url);
    const category = url.searchParams.get('category');
    const disposition = url.searchParams.get('disposition');
    const userId = url.searchParams.get('userId');
    const questionId = url.searchParams.get('questionId');
    const showArchived = url.searchParams.get('showArchived') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get all data needed for enrichment
    const authUsers = await supabase.auth.admin.listUsers();
    const usersFromAuth = authUsers.data?.users || [];
    
    const userProfiles = await kv.getByPrefix(KeyPatterns.allUserProfiles());
    const profilesMap = new Map();
    userProfiles.forEach((item) => {
      let profile = item.value || item;
      if (typeof profile === 'string') {
        try {
          profile = JSON.parse(profile);
        } catch (e) {
          return;
        }
      }
      if (profile?.id) {
        profilesMap.set(profile.id, profile);
      }
    });

    // Merge auth users with profiles
    const enrichedUsers: EnrichedUser[] = usersFromAuth.map((authUser) => {
      const profile = profilesMap.get(authUser.id) || {};
      return {
        id: authUser.id,
        email: authUser.email,
        name: profile.name || authUser.user_metadata?.name || authUser.email,
        is_admin: profile.is_admin || false,
        credits: profile.credits || 0,
        created_at: profile.created_at || authUser.created_at
      };
    });

    const usersMap = new Map();
    enrichedUsers.forEach((user) => {
      usersMap.set(user.id, user);
    });

    // Get questions and exam results
    const [newResults, oldResults, questionsKvItems] = await Promise.all([
      kv.getByPrefix(KeyPatterns.allResults()),
      kv.getByPrefix(KeyPatterns.allResultsOld()),
      kv.getByPrefix(KeyPatterns.allQuestions())
    ]);
    
    const examResultsKvItems = [...newResults, ...oldResults];

    const questionsMap = new Map();
    questionsKvItems.forEach((kvItem) => {
      const question = kvItem.value || kvItem;
      if (question?.id) {
        questionsMap.set(question.id, question);
      }
    });

    // Fetch standalone comments
    const standaloneCommentsKvItems = await kv.getByPrefix(KeyPatterns.allComments());
    const allComments: Comment[] = [];
    
    // Process standalone comments
    standaloneCommentsKvItems.forEach((kvItem) => {
      const comment = kvItem.value || kvItem;
      
      // Skip index keys
      const colonCount = (kvItem.key?.match(/:/g) || []).length;
      if (colonCount > 1) {
        return;
      }
      
      if (comment && comment.id) {
        const userData = usersMap.get(comment.userId);
        const questionData = comment.questionId 
          ? questionsMap.get(comment.questionId) 
          : null;
        
        allComments.push({
          ...comment,
          userEmail: userData?.email || comment.userEmail || 'Unknown Email',
          userName: userData?.name || comment.userName || userData?.email || 'Unknown User',
          questionText: questionData?.question || 'Question text not found',
          questionCategory: questionData?.category || 'Unknown Category',
          questionPreview: questionData?.question 
            ? (questionData.question.length > 60 
                ? questionData.question.substring(0, 60) + '...' 
                : questionData.question)
            : 'Question not found'
        });
      }
    });
    
    // Extract comments from exam results (legacy embedded comments)
    let embeddedCommentsCount = 0;
    
    examResultsKvItems.forEach((kvItem) => {
      const examResult = kvItem.value || kvItem;
      
      if (examResult && examResult.questionComments) {
        embeddedCommentsCount += Object.keys(examResult.questionComments).length;
        
        const { questionComments, userId, examId, completedAt } = examResult;
        const userData = usersMap.get(userId);
        
        Object.entries(questionComments).forEach(([questionId, commentText]) => {
          if (commentText && typeof commentText === 'string' && commentText.trim()) {
            const questionData = questionsMap.get(questionId);
            const comment: Comment = {
              id: `${examId}-${questionId}`,
              userId: userId,
              questionId: questionId,
              examId: examId,
              content: commentText,
              category: 'Other' as CommentCategory,
              disposition: 'Under Review' as CommentDisposition,
              createdAt: completedAt,
              updatedAt: completedAt,
              responses: [],
              metadata: {},
              userEmail: userData?.email || 'Unknown Email',
              userName: userData?.name || userData?.email || 'Unknown User',
              questionText: questionData?.question || 'Question text not found',
              questionCategory: questionData?.category || 'Unknown Category'
            };
            allComments.push(comment);
          }
        });
      }
    });
    
    // Apply filters
    let filteredComments = allComments;
    
    if (!showArchived) {
      filteredComments = filteredComments.filter((comment) => comment.disposition !== 'Archived');
    }
    
    if (category) {
      filteredComments = filteredComments.filter((comment) => comment.category === category);
    }
    if (disposition) {
      filteredComments = filteredComments.filter((comment) => comment.disposition === disposition);
    }
    if (userId) {
      filteredComments = filteredComments.filter((comment) => comment.userId === userId);
    }
    if (questionId) {
      filteredComments = filteredComments.filter((comment) => comment.questionId === questionId);
    }
    
    // Sort by creation date (newest first)
    const sortedComments = filteredComments.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Apply pagination
    const paginatedComments = sortedComments.slice(offset, offset + limit);
    
    return c.json({
      success: true,
      data: {
        comments: paginatedComments,
        total: sortedComments.length,
        hasMore: offset + limit < sortedComments.length,
        debug: {
          totalUsers: usersMap.size,
          totalAuthUsers: usersFromAuth.length,
          totalProfiles: profilesMap.size,
          standaloneComments: standaloneCommentsKvItems.length,
          embeddedComments: embeddedCommentsCount,
          totalComments: allComments.length
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching enriched comments:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
    return c.json({
      success: false,
      error: `Failed to fetch comments: ${error instanceof Error ? error.message : String(error)}`
    }, 500);
  }
});

comments.post('/admin/comments', async (c) => {
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
    const { userId, questionId, content, category, examId, metadata } = body;

    if (!userId || !content || !category) {
      return c.json({
        success: false,
        error: 'Missing required fields: userId, content, category'
      }, 400);
    }

    const commentId = generateId();
    const timestamp = new Date().toISOString();

    const comment = {
      id: commentId,
      userId,
      questionId: questionId || null,
      examId: examId || null,
      content,
      category,
      disposition: 'Under Review',
      createdAt: timestamp,
      updatedAt: timestamp,
      responses: [],
      metadata: metadata || {}
    };

    // Store with multiple keys for efficient querying
    const keys = [
      Keys.comment(commentId),
      Keys.commentsByCategory(category, commentId),
      Keys.commentsByDisposition('Under Review', commentId),
      Keys.commentsByUser(userId, commentId)
    ];

    if (questionId) {
      keys.push(Keys.commentsByQuestion(questionId, commentId));
    }
    if (examId) {
      keys.push(Keys.commentsByExam(examId, commentId));
    }

    const values = keys.map(() => comment);
    await kv.mset(keys, values);

    return c.json({
      success: true,
      data: {
        comment
      }
    });
  } catch (error) {
    console.log('Error creating comment:', error);
    return c.json({
      error: 'Failed to create comment'
    }, 500);
  }
});

comments.put('/admin/comments/:id', async (c) => {
  try {
    
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const commentId = c.req.param('id');
    const simpleCommentId = commentId.includes(':') ? 
      commentId.split(':').pop() || commentId : 
      commentId;
    
    const { disposition, response, metadata } = await c.req.json();
    
    // Fetch existing comment
    const existingComment = await kv.get(Keys.comment(simpleCommentId));
    
    if (!existingComment) {
      console.error(`❌ Comment not found with key: ${Keys.comment(simpleCommentId)}`);
      
      // Check if this is a legacy embedded comment
      const parts = simpleCommentId.split('-');
      if (parts.length >= 4) {
        return c.json({
          success: false,
          error: 'Cannot update embedded comment. These must be migrated to standalone format first.',
          metadata: {
            commentType: 'embedded',
            migrationNeeded: true
          }
        }, 400);
      }
      
      return c.json({
        success: false,
        error: 'Comment not found'
      }, 404);
    }
    
    // Build updated comment
    const updatedComment = {
      ...existingComment,
      disposition: disposition || existingComment.disposition,
      updatedAt: new Date().toISOString(),
      metadata: {
        ...existingComment.metadata,
        ...(metadata || {})
      }
    };
    
    // Add admin response if provided
    if (response) {
      updatedComment.responses = [
        ...existingComment.responses,
        {
          id: generateId(),
          text: response,
          adminId: authResult.user.id,
          createdAt: new Date().toISOString()
        }
      ];
    }
    
    // Update disposition index if changed
    if (disposition && disposition !== existingComment.disposition) {
      const oldDispositionKey = Keys.commentsByDisposition(existingComment.disposition, simpleCommentId);
      const newDispositionKey = Keys.commentsByDisposition(disposition, simpleCommentId);
      
      await kv.del(oldDispositionKey);
      
      const keysToUpdate = [
        Keys.comment(simpleCommentId),
        Keys.commentsByCategory(updatedComment.category, simpleCommentId),
        newDispositionKey,
        Keys.commentsByUser(updatedComment.userId, simpleCommentId)
      ];
      
      if (updatedComment.questionId) {
        keysToUpdate.push(Keys.commentsByQuestion(updatedComment.questionId, simpleCommentId));
      }
      if (updatedComment.examId) {
        keysToUpdate.push(Keys.commentsByExam(updatedComment.examId, simpleCommentId));
      }
      
      const values = keysToUpdate.map(() => updatedComment);
      await kv.mset(keysToUpdate, values);
    } else {
      // Just update main comment key
      await kv.set(Keys.comment(simpleCommentId), updatedComment);
    }
    
    return c.json({
      success: true,
      data: {
        comment: updatedComment
      }
    });
  } catch (error) {
    console.log('Error updating comment:', error);
    return c.json({
      error: 'Failed to update comment'
    }, 500);
  }
});

comments.delete('/admin/comments/:id', async (c) => {
  try {
    
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const commentId = c.req.param('id');
    const simpleCommentId = commentId.includes(':') ? 
      commentId.split(':').pop() || commentId : 
      commentId;
    
    const existingComment = await kv.get(Keys.comment(simpleCommentId));
    
    if (!existingComment) {
      // Check if this is a legacy embedded comment
      const parts = simpleCommentId.split('-');
      if (parts.length >= 4) {
        return c.json({
          success: false,
          error: 'Cannot archive embedded comments. These are stored as simple strings in exam results and need migration to standalone format for full management capabilities.',
          metadata: {
            commentType: 'embedded',
            migrationNeeded: true
          }
        }, 400);
      }
      
      return c.json({
        success: false,
        error: 'Comment not found'
      }, 404);
    }
    
    // Archive the comment by changing disposition to 'Archived'
    const archivedComment = {
      ...existingComment,
      disposition: 'Archived' as const,
      updatedAt: new Date().toISOString(),
      metadata: {
        ...existingComment.metadata,
        archivedAt: new Date().toISOString(),
        archivedBy: 'admin'
      }
    };
    
    // Update all index keys with archived disposition
    const oldDispositionKey = Keys.commentsByDisposition(existingComment.disposition, simpleCommentId);
    const newDispositionKey = Keys.commentsByDisposition('Archived', simpleCommentId);
    
    await kv.del(oldDispositionKey);
    
    const keysToUpdate = [
      Keys.comment(simpleCommentId),
      Keys.commentsByCategory(archivedComment.category, simpleCommentId),
      newDispositionKey,
      Keys.commentsByUser(archivedComment.userId, simpleCommentId)
    ];
    
    if (archivedComment.questionId) {
      keysToUpdate.push(Keys.commentsByQuestion(archivedComment.questionId, simpleCommentId));
    }
    if (archivedComment.examId) {
      keysToUpdate.push(Keys.commentsByExam(archivedComment.examId, simpleCommentId));
    }
    
    const values = keysToUpdate.map(() => archivedComment);
    await kv.mset(keysToUpdate, values);
    
    return c.json({
      success: true,
      message: 'Comment archived successfully',
      data: {
        comment: archivedComment
      }
    });
  } catch (error) {
    console.error('❌ Error deleting comment:', error);
    return c.json({
      success: false,
      error: 'Failed to delete comment'
    }, 500);
  }
});

comments.get('/admin/comments/stats', async (c) => {
  try {
    
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    // Get all comments
    const standaloneComments = await kv.getByPrefix(KeyPatterns.allComments());
    
    // Filter out index keys (only keep main comment entries)
    const mainComments = standaloneComments.filter(kvItem => {
      const colonCount = (kvItem.key?.match(/:/g) || []).length;
      return colonCount === 1; // Main keys have exactly 1 colon
    });

    // Count by disposition
    const dispositionCounts: Record<string, number> = {};
    mainComments.forEach(kvItem => {
      const comment = kvItem.value || kvItem;
      const disposition = comment.disposition || 'Unknown';
      dispositionCounts[disposition] = (dispositionCounts[disposition] || 0) + 1;
    });

    return c.json({
      success: true,
      data: {
        total: mainComments.length,
        byDisposition: dispositionCounts
      }
    });
  } catch (error) {
    console.error('❌ Error fetching comment stats:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch comment stats'
    }, 500);
  }
});

export default comments;