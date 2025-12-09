import { Hono } from 'npm:hono';
import * as kv from './kv_store.ts';
import { Keys, KeyPatterns, generateId } from './keys.ts';
import type { ServerExamResult, CreditTransaction, UserExam } from './types.ts';
import { requireAdmin, requireUser } from './auth-utils.ts';
import { getUserProfileStats } from './profile-stats.ts';

const userProfileApp = new Hono();

// Get user's exams (admin only)
userProfileApp.get('/admin/users/:userId/exams', async (c) => {
  try {
    
    // Require admin authentication
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const userId = c.req.param('userId');
    if (!userId) {
      return c.json({
        success: false,
        error: 'User ID is required'
      }, 400);
    }

    // Get all exam results for this user (support both old and new prefixes)
    const [newResults, oldResults] = await Promise.all([
      kv.getByPrefix(KeyPatterns.allResults()),
      kv.getByPrefix(KeyPatterns.allResultsOld())
    ]);
    const examResultsKvItems = [...newResults, ...oldResults];

    const userExams: UserExam[] = [];
    examResultsKvItems.forEach((kvItem) => {
      const examResult = kvItem.value || kvItem;
      if (examResult && examResult.userId === userId) {
        const exam = {
          id: examResult.examId,
          examId: examResult.examId,
          examTitle: examResult.examTitle || 'Unknown Exam',
          score: examResult.score || 0,
          totalQuestions: examResult.totalQuestions || 0,
          completedAt: examResult.completedAt,
          timeSpent: examResult.timeSpent || 0,
          passed: examResult.passed || false,
          answers: examResult.answers || {},
          questionComments: examResult.questionComments || {}
        };
        userExams.push(exam);
      }
    });

    // Sort by completion date (newest first)
    userExams.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

    console.log(`📊 Found ${userExams.length} exams for user ${userId}`);

    return c.json({
      success: true,
      data: userExams
    });
  } catch (error) {
    console.log('❌ Error fetching user exams:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch user exams'
    }, 500);
  }
});

// Admin endpoint to get user exam history
userProfileApp.get('/admin/users/:userId/exam-history', async (c) => {
  try {
    
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const userId = c.req.param('userId');

    // Get all exam results from KV store (support both old and new prefixes)
    const [newResults, oldResults] = await Promise.all([
      kv.getByPrefix(KeyPatterns.allResults()),
      kv.getByPrefix(KeyPatterns.allResultsOld())
    ]);
    const rawResults = [...newResults, ...oldResults];

    // Filter results for this specific user and transform them
    const userResults = await Promise.all(rawResults.map(async (item) => {
      let resultData: ServerExamResult | null = null;
      if (typeof item.value === 'string') {
        try {
          resultData = JSON.parse(item.value);
        } catch (e) {
          console.error('❌ Failed to parse result JSON:', item.value);
          return null;
        }
      } else {
        resultData = item.value;
      }

      // Only include results for this user
      if (resultData?.userId !== userId) {
        return null;
      }

      // Get template title
      let templateTitle = 'Unknown Exam';
      if (resultData?.templateId) {
        try {
          const template = await kv.get(Keys.template(resultData.templateId));
          if (template) {
            const templateData = typeof template === 'string' ? JSON.parse(template) : template;
            templateTitle = templateData.title || 'Unknown Exam';
          }
        } catch (e) {
          console.warn(`Failed to get template title for ${resultData.templateId}:`, e);
        }
      }

      return {
        id: item.key,
        examId: resultData?.examId,
        templateId: resultData?.templateId,
        templateTitle: templateTitle,
        totalQuestions: resultData?.totalQuestions || 0,
        answeredQuestions: resultData?.answeredQuestions || 0,
        correctAnswers: resultData?.correctAnswers || 0,
        score: resultData?.correctAnswers || 0,
        percentage: resultData?.score || 0,
        submittedAt: resultData?.completedAt,
        completedAt: resultData?.completedAt,
        detailedResults: resultData?.detailedResults || []
      };
    }));

    // Filter out null results and sort by submission date
    const validUserResults = userResults.filter(Boolean).sort((a, b) => 
      new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
    );

    return c.json({
      success: true,
      data: validUserResults
    });
  } catch (error) {
    console.error('Error fetching user exam history:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch user exam history'
    }, 500);
  }
});

// Issue credits to a user (admin only)
userProfileApp.post('/admin/users/:userId/credits', async (c) => {
  try {
    
    // Require admin authentication
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const userId = c.req.param('userId');
    if (!userId) {
      return c.json({
        success: false,
        error: 'User ID is required'
      }, 400);
    }

    const body = await c.req.json();
    const { amount, note } = body;

    if (!amount || amount <= 0) {
      return c.json({
        success: false,
        error: 'Valid credit amount is required'
      }, 400);
    }

    // Get current user profile
    const currentProfile = await kv.get(Keys.user(userId));
    let userProfile = currentProfile;

    // Handle double-encoded JSON strings
    if (typeof userProfile === 'string') {
      try {
        userProfile = JSON.parse(userProfile);
      } catch (e) {
        userProfile = null;
      }
    }

    if (!userProfile) {
      return c.json({
        success: false,
        error: 'User profile not found'
      }, 404);
    }

    // Update credits
    const updatedProfile = {
      ...userProfile,
      credits: (userProfile.credits || 0) + amount,
      updated_at: new Date().toISOString()
    };

    await kv.set(Keys.user(userId), updatedProfile);

    // Log the credit transaction
    const creditTransaction = {
      id: generateId(),
      userId,
      amount,
      note: note || 'Credits issued by admin',
      issuedBy: authResult.user?.id || 'unknown',
      issuedAt: new Date().toISOString(),
      type: 'admin_issued'
    };

    await kv.set(Keys.creditTransaction(creditTransaction.id), creditTransaction);

    return c.json({
      success: true,
      data: {
        newBalance: updatedProfile.credits,
        transaction: creditTransaction
      }
    });
  } catch (error) {
    console.log('❌ Error issuing credits:', error);
    return c.json({
      success: false,
      error: 'Failed to issue credits'
    }, 500);
  }
});

// Get user's credit history (admin only)
userProfileApp.get('/admin/users/:userId/credits/history', async (c) => {
  try {
    console.log('👤 routes-user-profile.tsx: GET /admin/users/:userId/credits/history');
    
    // Require admin authentication
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const userId = c.req.param('userId');
    if (!userId) {
      return c.json({
        success: false,
        error: 'User ID is required'
      }, 400);
    }

    // Get all credit transactions for this user
    const transactionItems = await kv.getByPrefix(KeyPatterns.allCreditTransactions());
    const userTransactions: CreditTransaction[] = [];

    transactionItems.forEach((kvItem) => {
      const transaction = kvItem.value || kvItem;
      if (transaction && transaction.userId === userId) {
        userTransactions.push(transaction);
      }
    });

    // Sort by issued date (newest first)
    userTransactions.sort((a, b) => {
      const dateA = new Date(a.issuedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.issuedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return c.json({
      success: true,
      data: userTransactions
    });
  } catch (error) {
    console.log('❌ Error fetching credit history:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch credit history'
    }, 500);
  }
});

// ========================================
// USER-FACING PROFILE ENDPOINTS
// ========================================

// Get user's own profile statistics
userProfileApp.get('/user/profile/stats', async (c) => {
  try {
    
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireUser(accessToken);
    
    if (authResult.error) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }
    
    const stats = await getUserProfileStats(authResult.user?.id!);
    return c.json({ success: true, data: stats });
    
  } catch (error) {
    console.error('❌ Error fetching user profile stats:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch profile statistics' 
    }, 500);
  }
});

// User-facing endpoint to get their own exam history
userProfileApp.get('/user/exam-history', async (c) => {
  try {
    console.log('👤 routes-user-profile.tsx: GET /user/exam-history');
    
    // Require authentication (but NOT admin)
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireUser(accessToken);
    
    if (authResult.error) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const userId = authResult.user?.id!;

    // Get all exam results from KV store (support both old and new prefixes)
    const [newResults, oldResults] = await Promise.all([
      kv.getByPrefix(KeyPatterns.allResults()),
      kv.getByPrefix(KeyPatterns.allResultsOld())
    ]);
    const rawResults = [...newResults, ...oldResults];

    // Filter results for THIS user only and transform them
    const userResults = await Promise.all(rawResults.map(async (item) => {
      let resultData: ServerExamResult | null = null;
      if (typeof item.value === 'string') {
        try {
          resultData = JSON.parse(item.value);
        } catch (e) {
          console.error('❌ Failed to parse result JSON:', item.value);
          return null;
        }
      } else {
        resultData = item.value;
      }

      // SECURITY: Only include results for the authenticated user
      if (resultData?.userId !== userId) {
        return null;
      }

      // Get template title
      let templateTitle = 'Unknown Exam';
      if (resultData?.templateId) {
        try {
          const template = await kv.get(Keys.template(resultData.templateId));
          if (template) {
            const templateData = typeof template === 'string' ? JSON.parse(template) : template;
            templateTitle = templateData.title || 'Unknown Exam';
          }
        } catch (e) {
          console.warn(`Failed to get template title for ${resultData.templateId}:`, e);
        }
      }

      return {
        id: item.key,
        examId: resultData?.examId,
        templateId: resultData?.templateId,
        templateTitle: templateTitle,
        totalQuestions: resultData?.totalQuestions || 0,
        answeredQuestions: resultData?.answeredQuestions || 0,
        correctAnswers: resultData?.correctAnswers || 0,
        score: resultData?.correctAnswers || 0,
        percentage: resultData?.score || 0,
        submittedAt: resultData?.completedAt,
        completedAt: resultData?.completedAt,
        detailedResults: resultData?.detailedResults || []
      };
    }));

    // Filter out null results and sort by submission date (newest first)
    const validResults = userResults
      .filter((r): r is NonNullable<typeof r> => r !== null && r !== undefined)
      .sort((a, b) => {
        const dateA = new Date(a.submittedAt || 0).getTime();
        const dateB = new Date(b.submittedAt || 0).getTime();
        return dateB - dateA;
      });

    console.log(`✅ Found ${validResults.length} exam results for user ${userId}`);

    return c.json({
      success: true,
      data: validResults
    });

  } catch (error) {
    console.error('❌ Error fetching user exam history:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch exam history'
    }, 500);
  }
});

export default userProfileApp;