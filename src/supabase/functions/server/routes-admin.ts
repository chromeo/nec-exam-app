import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js';
import * as kv from './kv_store.ts';
import { Keys, KeyPatterns, KeyUtils, generateId, getByPrefixWithFallback } from './keys.ts';
import type { AuthResult, ServerExamResult } from './types.ts';

const admin = new Hono();

console.log('🔧 Admin routes module loaded');

// Create Supabase clients (same as index.ts)
const supabaseForAuth = createClient(
  Deno.env.get('SUPABASE_URL')!, 
  Deno.env.get('SUPABASE_ANON_KEY')!
);

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const publicAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

// Auth helper function (duplicated from index.ts for route module independence)
const requireAdmin = async (accessToken: string | undefined): Promise<AuthResult> => {
  if (!accessToken || accessToken === publicAnonKey) {
    return {
      isAdmin: false,
      error: 'Authentication required',
      status: 401
    };
  }

  // ✅ Use ANON_KEY client for token validation (correct for user tokens)
  const { data: { user }, error } = await supabaseForAuth.auth.getUser(accessToken);
  if (!user || error) {
    console.error('❌ Token validation failed:', error?.message || 'Unknown error');
    return {
      isAdmin: false,
      error: 'Invalid or expired token',
      status: 401
    };
  }

  const userProfile = await kv.get(Keys.userProfile(user.id));
  
  // Enhanced Admin Check with Multiple Fallbacks
  let isAdmin = false;
  let profileData: any = null;

  // Method 1: Check existing user profile
  if (userProfile) {
    profileData = typeof userProfile === 'string' ? JSON.parse(userProfile) : userProfile;
    isAdmin = profileData.is_admin || false;
  }
  // Method 2: Check Supabase user metadata
  if (!isAdmin && (user.user_metadata?.is_admin || user.app_metadata?.is_admin)) {
    isAdmin = true;
    profileData = {
      email: user.email,
      name: user.user_metadata?.name || user.email,
      is_admin: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await kv.set(Keys.userProfile(user.id), profileData);
  }

  // Method 3: Check admin email list (add your emails here)
  if (!isAdmin) {
    const adminEmails = [
      'garyd@mastercraftinc.com',
      'garydarling@gmail.com'
      // Add your email here to get admin access
    ];
    
    if (adminEmails.includes(user.email || '')) {
      isAdmin = true;
      profileData = {
        email: user.email,
        name: user.user_metadata?.name || user.email,
        is_admin: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_based_admin: true
      };
      await kv.set(Keys.userProfile(user.id), profileData);
    }
  }

  // Method 4: Create default profile if none exists
  if (!profileData) {
    profileData = {
      email: user.email,
      name: user.user_metadata?.name || user.email,
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await kv.set(Keys.userProfile(user.id), profileData);
  }

  if (!isAdmin) {
    return {
      isAdmin: false,
      error: 'Admin access required',
      status: 403
    };
  }

  return {
    isAdmin: true,
    user,
    profileData
  };
};

// ========================================
// ADMIN PING - SESSION VALIDATION
// ========================================

admin.get('/admin/ping', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken || accessToken === publicAnonKey) {
      return c.json({
        success: false,
        error: 'Authentication required'
      }, 401);
    }

    // Validate token with Supabase
    const { data: { user }, error: authError } = await supabaseForAuth.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({
        success: false,
        error: 'Invalid or expired token'
      }, 401);
    }

    // Optional: Check if user is admin for admin ping
    const userProfile = await kv.get(Keys.userProfile(user.id));
    const profileData = typeof userProfile === 'string' ? JSON.parse(userProfile) : userProfile;
    const isAdmin = profileData?.is_admin || false;

    return c.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        isAdmin,
        sessionValid: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Session ping error:', error);
    return c.json({
      success: false,
      error: 'Session validation failed'
    }, 500);
  }
});

// ========================================
// DASHBOARD ENDPOINT
// ========================================

admin.get('/admin/dashboard', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const questions = await kv.getByPrefix(KeyPatterns.allQuestions());
    const templates = await kv.getByPrefix(KeyPatterns.allTemplates());
    const users = await kv.getByPrefix(KeyPatterns.allUserProfiles());
    const exams = await getByPrefixWithFallback(
      kv,
      KeyPatterns.allSessions(),
      KeyPatterns.allSessionsOld()
    );

    const dashboardData = {
      totalQuestions: questions.length,
      totalTemplates: templates.length,
      totalUsers: users.length,
      totalExams: exams.length,
      recentActivity: `${exams.length} exams taken, ${questions.length} questions in database`
    };

    return c.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch dashboard data'
    }, 500);
  }
});

// ========================================
// USER MANAGEMENT ENDPOINTS
// ========================================

admin.get('/admin/users', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    console.log('📦 routes-admin.ts: GET /admin/users called');
    const rawUsers = await kv.getByPrefix(KeyPatterns.allUserProfiles());
    
    // Parse and transform user profiles
    const parsedUsers = rawUsers.map((item) => {
      // Handle both object and string formats
      let userData;
      if (typeof item.value === 'string') {
        try {
          userData = JSON.parse(item.value);
        } catch (e) {
          console.error('❌ Failed to parse user profile JSON:', item.value);
          return null;
        }
      } else {
        userData = item.value;
      }

      // Ensure we have a proper user object with consistent field names
      return {
        id: userData?.id || KeyUtils.extractId(item.key),
        email: userData?.email || 'Unknown',
        name: userData?.name || 'Unknown User',
        is_admin: userData?.is_admin || false,
        credits: userData?.credits || 0,
        created_at: userData?.created_at || new Date().toISOString(),
        ...userData
      };
    }).filter(Boolean); // Remove any null values

    return c.json({
      success: true,
      data: parsedUsers
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch users'
    }, 500);
  }
});

// ========================================
// QUESTION CATEGORIES ENDPOINTS
// ========================================

admin.get('/admin/question-categories', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const rawCategories = await kv.getByPrefix(KeyPatterns.allQuestionCategories());
    
    // Transform the data to extract just the category information
    const categories = rawCategories.map((item) => {
      // Handle both object and string formats
      let categoryData: { name: string; id?: string; [key: string]: any } | null = null;
      if (typeof item.value === 'string') {
        try {
          categoryData = JSON.parse(item.value);
        } catch (e) {
          console.error('Failed to parse category JSON:', item.value);
          return null;
        }
      } else {
        categoryData = item.value;
      }

      // Return just the name for simple category lists
      return categoryData?.name || categoryData?.id || KeyUtils.extractId(item.key);
    }).filter(Boolean); // Remove any null values

    return c.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching question categories:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch question categories'
    }, 500);
  }
});

admin.post('/admin/question-categories', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const categoryData = await c.req.json();
    const categoryId = generateId();
    const category = {
      id: categoryId,
      ...categoryData,
      type: 'question',
      created_at: new Date().toISOString()
    };

    await kv.set(Keys.questionCategory(categoryId), { ...category, id: categoryId });

    return c.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error creating question category:', error);
    return c.json({
      success: false,
      error: 'Failed to create question category'
    }, 500);
  }
});

admin.delete('/admin/question-categories/:name', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const categoryName = decodeURIComponent(c.req.param('name'));
    
    // Find the category by name
    const allCategories = await kv.getByPrefix(KeyPatterns.allQuestionCategories());
    const categoryToDelete = allCategories.find((item) => {
      let categoryData;
      if (typeof item.value === 'string') {
        try {
          categoryData = JSON.parse(item.value);
        } catch (e) {
          return false;
        }
      } else {
        categoryData = item.value;
      }

      const name = categoryData?.name || categoryData?.id || KeyUtils.extractId(item.key);
      return name === categoryName;
    });

    if (!categoryToDelete) {
      return c.json({
        success: false,
        error: 'Category not found'
      }, 404);
    }

    await kv.del(categoryToDelete.key);

    return c.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting question category:', error);
    return c.json({
      success: false,
      error: 'Failed to delete category'
    }, 500);
  }
});

// ========================================
// EXAM RESULTS ENDPOINTS
// ========================================

// DEBUG: Create test exam result (for testing only)
admin.post('/admin/results/create-test', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    // Create a test exam session
    const testSessionId = Keys.session(`test-${Date.now()}`);
    const testSession = {
      id: testSessionId,
      userId: 'test-user-123',
      templateId: 'test-template',
      templateTitle: 'Test Exam Template',
      questions: [
        {
          id: 'q1',
          question: 'What is 2 + 2?',
          options: ['3', '4', '5', '6'],
          correctAnswer: 1,
          category: 'Math'
        },
        {
          id: 'q2',
          question: 'What is the capital of France?',
          options: ['London', 'Berlin', 'Paris', 'Rome'],
          correctAnswer: 2,
          category: 'Geography'
        }
      ],
      answers: {
        'q1': 1,
        'q2': 2
      },
      startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      endTime: new Date().toISOString(),
      status: 'completed',
      created_at: new Date().toISOString()
    };

    await kv.set(testSessionId, testSession);

    return c.json({
      success: true,
      message: 'Test exam result created',
      data: testSession
    });
  } catch (error) {
    console.error('Error creating test exam result:', error);
    return c.json({
      success: false,
      error: 'Failed to create test exam result'
    }, 500);
  }
});

// GET all submitted exam results
admin.get('/admin/results', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    // Fetch only submitted exam results (not in-progress sessions)
    const rawResults = await getByPrefixWithFallback(
      kv,
      KeyPatterns.allResults(),
      KeyPatterns.allResultsOld()
    );

    // Parse and transform results to match frontend expectations
    const parsedResults = await Promise.all(rawResults.map(async (item) => {
      let resultData: ServerExamResult | null = null;
      if (typeof item.value === 'string') {
        try {
          resultData = JSON.parse(item.value);
          // Handle double-encoded data from old submissions
          if (typeof resultData === 'string') {
            resultData = JSON.parse(resultData);
          }
        } catch (e) {
          console.error('❌ Failed to parse result JSON:', item.value);
          return null;
        }
      } else {
        resultData = item.value;
      }

      // Get template title from template data
      let templateTitle = 'Unknown Exam';
      if (resultData && resultData.templateId) {
        try {
          const cleanTemplateId = KeyUtils.extractId(resultData.templateId);
          const template = await kv.get(Keys.template(cleanTemplateId));
          if (template) {
            const templateData = typeof template === 'string' ? JSON.parse(template) : template;
            templateTitle = templateData.title || 'Unknown Exam';
          }
        } catch (e) {
          console.warn(`Failed to get template title for ${resultData.templateId}:`, e);
        }
      }

      // Get user name from user profile
      let studentName = resultData?.userId || 'Unknown User';
      if (resultData?.userId) {
        try {
          const userProfile = await kv.get(Keys.userProfile(resultData.userId));
          if (userProfile) {
            const userData = typeof userProfile === 'string' ? JSON.parse(userProfile) : userProfile;
            studentName = userData.name || userData.email || resultData.userId;
          }
        } catch (e) {
          console.warn(`Failed to get user name for ${resultData.userId}:`, e);
        }
      }

      // Transform to frontend format
      return {
        id: item.key,
        examId: resultData?.examId,
        templateId: resultData?.templateId,
        templateTitle: templateTitle,
        examTitle: templateTitle,
        studentId: studentName,
        userId: resultData?.userId,
        totalQuestions: resultData?.totalQuestions || 0,
        answeredQuestions: resultData?.answeredQuestions || 0,
        correctAnswers: resultData?.correctAnswers || 0,
        score: resultData?.correctAnswers || 0,
        percentage: resultData?.score || 0,
        submittedAt: resultData?.completedAt,
        completedAt: resultData?.completedAt,
        detailedResults: resultData?.detailedResults || [],
        questionComments: resultData?.questionComments || {},
        flaggedQuestions: resultData?.flaggedQuestions || {}
      };
    }));

    // Filter out any null results and sort by submission date
    const validResults = parsedResults
      .filter((result): result is NonNullable<typeof result> => result !== null)
      .sort((a, b) => {
        const dateA = new Date(a.submittedAt || 0).getTime();
        const dateB = new Date(b.submittedAt || 0).getTime();
        return dateB - dateA;
      });

    return c.json({
      success: true,
      data: validResults
    });
  } catch (error) {
    console.error('Error fetching admin exam results:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch exam results'
    }, 500);
  }
});

// DELETE a specific result
admin.delete('/admin/results/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const resultId = c.req.param('id');

    // Check if result exists
    const existingResult = await kv.get(resultId);
    if (!existingResult) {
      return c.json({
        success: false,
        error: 'Exam result not found'
      }, 404);
    }

    // Delete the result
    await kv.del(resultId);

    return c.json({
      success: true,
      message: 'Exam result deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting exam result:', error);
    return c.json({
      success: false,
      error: 'Failed to delete exam result'
    }, 500);
  }
});

// ========================================
// EXAM SESSIONS ENDPOINTS
// ========================================

// GET all active/stale exam sessions
admin.get('/admin/sessions', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    // Fetch all sessions (both old and new formats)
    const rawSessions = await getByPrefixWithFallback(
      kv,
      KeyPatterns.allSessions(),
      KeyPatterns.allSessionsOld()
    );

    console.log(`📊 Found ${rawSessions.length} total sessions in database`);

    // Parse and transform sessions
    const parsedSessions = await Promise.all(rawSessions.map(async (item) => {
      let sessionData: any = null;

      if (typeof item.value === 'string') {
        try {
          sessionData = JSON.parse(item.value);
        } catch (e) {
          console.error('❌ Failed to parse session JSON:', item.value);
          return null;
        }
      } else {
        sessionData = item.value;
      }

      // Get user name from user profile
      let studentName = sessionData?.userId || 'Unknown User';
      if (sessionData?.userId) {
        try {
          const userProfile = await kv.get(Keys.userProfile(sessionData.userId));
          if (userProfile) {
            const userData = typeof userProfile === 'string' ? JSON.parse(userProfile) : userProfile;
            studentName = userData.name || userData.email || sessionData.userId;
          }
        } catch (e) {
          console.warn(`Failed to get user name for ${sessionData.userId}:`, e);
        }
      }

      // Calculate session age and determine if stale
      const startTime = new Date(sessionData?.startTime || sessionData?.created_at || 0);
      const now = new Date();
      const ageInHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      const timeLimit = sessionData?.timeLimit || 60; // minutes
      const expectedDuration = timeLimit / 60; // hours
      const isStale = ageInHours > Math.max(expectedDuration + 0.5, 4); // Stale if > expected + 30min or > 4 hours

      return {
        id: item.key,
        sessionId: sessionData?.id,
        templateId: sessionData?.templateId,
        examTitle: sessionData?.templateTitle || sessionData?.title || 'Unknown Exam',
        studentId: studentName,
        userId: sessionData?.userId,
        startTime: sessionData?.startTime || sessionData?.created_at,
        timeLimit: sessionData?.timeLimit || 60,
        status: sessionData?.status || 'in_progress',
        questionsCount: sessionData?.questions?.length || 0,
        answersCount: Object.keys(sessionData?.answers || {}).length,
        ageInHours: Math.round(ageInHours * 10) / 10,
        isStale
      };
    }));

    // Filter out null results and sort by start time (newest first)
    const validSessions = parsedSessions
      .filter((session): session is NonNullable<typeof session> => session !== null)
      .sort((a, b) => {
        const dateA = new Date(a.startTime || 0).getTime();
        const dateB = new Date(b.startTime || 0).getTime();
        return dateB - dateA;
      });

    return c.json({
      success: true,
      data: validSessions
    });
  } catch (error) {
    console.error('Error fetching admin exam sessions:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch exam sessions'
    }, 500);
  }
});

// DELETE a specific session
admin.delete('/admin/sessions/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const sessionId = c.req.param('id');

    // Check if session exists
    const existingSession = await kv.get(sessionId);
    if (!existingSession) {
      return c.json({
        success: false,
        error: 'Session not found'
      }, 404);
    }

    // Delete the session
    await kv.del(sessionId);

    return c.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    return c.json({
      success: false,
      error: 'Failed to delete session'
    }, 500);
  }
});

// Bulk cleanup of stale sessions
admin.post('/admin/sessions/cleanup-stale', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    // Get hoursThreshold from request body (default 4 hours)
    const body = await c.req.json().catch(() => ({}));
    const hoursThreshold = body.hoursThreshold || 4;

    // Fetch all sessions
    const rawSessions = await getByPrefixWithFallback(
      kv,
      KeyPatterns.allSessions(),
      KeyPatterns.allSessionsOld()
    );

    const now = new Date();
    const staleSessions: string[] = [];

    for (const item of rawSessions) {
      let sessionData: any = null;

      if (typeof item.value === 'string') {
        try {
          sessionData = JSON.parse(item.value);
        } catch (e) {
          continue;
        }
      } else {
        sessionData = item.value;
      }

      const startTime = new Date(sessionData?.startTime || sessionData?.created_at || 0);
      const ageInHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      if (ageInHours > hoursThreshold) {
        staleSessions.push(item.key);
      }
    }

    // Delete all stale sessions
    if (staleSessions.length > 0) {
      await kv.mdel(staleSessions);
      console.log(`🧹 Cleaned up ${staleSessions.length} stale sessions (older than ${hoursThreshold} hours)`);
    }

    return c.json({
      success: true,
      message: `Cleaned up ${staleSessions.length} stale sessions`,
      deletedCount: staleSessions.length,
      threshold: hoursThreshold
    });
  } catch (error) {
    console.error('Error cleaning up stale sessions:', error);
    return c.json({
      success: false,
      error: 'Failed to cleanup stale sessions'
    }, 500);
  }
});

export default admin;
