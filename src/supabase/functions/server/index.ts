import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import contentful from 'npm:contentful@10.6.21';

// Import route modules for testing (flat structure for Supabase compatibility)
import questionsRoutes from './routes-questions.ts';
import authRoutes from './routes-auth.ts';
import examsRoutes from './routes-exams.ts';
import adminRoutes from './routes-admin.ts';
import userFeedbackRoutes from './routes-user-feedback.ts';
import commentsRoutes from './routes-comments.ts';
import toursRoutes from './routes-tours.ts';
import testingFeedbackRoutes from './routes-testing-feedback.ts';
import guidelinesRoutes from './routes-guidelines.ts';
import userProfileRoutes from './routes-user-profile.ts';

const app = new Hono();

// Production environment check
const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development' || !isProduction;
// Middleware
app.use('*', logger(console.log));
app.use('*', cors({
  origin: '*',
  allowHeaders: [
    '*'
  ],
  allowMethods: [
    '*'
  ]
}));

// Root endpoint - Server discovery and status
app.get('/make-server-a9be5165/', (c) => {
  return c.json({
    success: true,
    name: 'Exam Platform API',
    version: 'v2.0-modular',
    status: 'operational',
    timestamp: new Date().toISOString(),
    environment: Deno.env.get('ENVIRONMENT') || 'production',
    endpoints: {
      health: '/make-server-a9be5165/health',
      guidelines: '/make-server-a9be5165/guidelines',
      auth: '/make-server-a9be5165/auth/*',
      admin: '/make-server-a9be5165/admin/*',
      exams: '/make-server-a9be5165/exams/*'
    },
    info: {
      description: 'Exam Platform - RESTful API for online electrical code exams',
      architecture: 'Modular route-based design with 10 specialized modules',
      authentication: 'Supabase Auth with JWT tokens'
    }
  });
});
// Home Page
app.get('/make-server-a9be5165/contentful/landing-page', async (c) => {
  try {
    console.log('🔄 Fetching landing page content from Contentful...');

    // Get Contentful credentials from environment
    const spaceId = Deno.env.get('VITE_CONTENTFUL_SPACE_ID');
    const accessToken = Deno.env.get('VITE_CONTENTFUL_ACCESS_TOKEN');

    if (!spaceId || !accessToken) {
      console.warn('⚠️ Contentful credentials not configured');
      return c.json({
        success: false,
        error: 'Contentful not configured',
        useDefaults: true
      }, 200); // Return 200 so client falls back to defaults gracefully
    }

    // Create Contentful client - CORRECTED: use contentful.createClient()
    const contentfulClient = contentful.createClient({
      space: spaceId,
      accessToken: accessToken,
    });

    console.log('✅ Contentful client created, fetching entries...');

    // Fetch landing page content
    const response = await contentfulClient.getEntries({
      content_type: 'landingPage',
      limit: 1,
      include: 2,
    });

    if (!response.items || response.items.length === 0) {
      console.warn('⚠️ No landing page entries found in Contentful');
      return c.json({
        success: false,
        error: 'No landing page found',
        useDefaults: true
      }, 200);
    }

    const entry = response.items[0];
    const fields = entry.fields;

    // DYNAMIC FIELD HANDLING - No hardcoding!
    // Process all fields dynamically, handling special cases like images
    const processedFields: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(fields)) {
      // Handle Contentful Asset fields (images, files)
      if (value && typeof value === 'object' && value.sys?.type === 'Asset') {
        processedFields[key] = value.fields?.file?.url || null;
      }
      // Handle Contentful Entry references (linked content)
      else if (value && typeof value === 'object' && value.sys?.type === 'Entry') {
        processedFields[key] = value.fields || null;
      }
      // Handle arrays of Assets or Entries
      else if (Array.isArray(value)) {
        processedFields[key] = value.map(item => {
          if (item && typeof item === 'object') {
            if (item.sys?.type === 'Asset') {
              return item.fields?.file?.url || item;
            } else if (item.sys?.type === 'Entry') {
              return item.fields || item;
            }
          }
          return item;
        });
      }
      // Pass through all other field types as-is
      else {
        processedFields[key] = value;
      }
    }

    console.log('✅ Landing page content fetched successfully');
    console.log('📊 Fields available:', Object.keys(processedFields));

    // Return ALL fields dynamically - no hardcoding required!
    return c.json({
      success: true,
      data: processedFields
    });

  } catch (error) {
    console.error('❌ Error fetching Contentful data:', error);
    return c.json({
      success: false,
      error: error.message,
      useDefaults: true
    }, 200); // Return 200 so client handles gracefully
  }
});
// Health check endpoint
app.get('/make-server-a9be5165/health', (c) => {
  return c.json({
    success: true,
    status: 'operational',
    message: 'Server is running',
    version: 'v2.0-modular-routes',
    timestamp: new Date().toISOString(),
    environment: Deno.env.get('ENVIRONMENT') || 'production',
    architecture: {
      pattern: 'modular-routes',
      totalModules: 10,
      description: 'Endpoints organized into focused route modules'
    },
    modules: {
      core: [
        'routes-auth.ts',
        'routes-questions.ts',
        'routes-exams.ts'
      ],
      admin: [
        'routes-admin.ts',
        'routes-user-feedback.ts',
        'routes-comments.ts',
        'routes-testing-feedback.ts',
        'routes-guidelines.ts'
      ],
      features: [
        'routes-tours.ts',
        'routes-user-profile.ts'
      ]
    },
    endpoints: {
      auth: '/make-server-a9be5165/auth/*',
      questions: '/make-server-a9be5165/admin/questions/*',
      exams: '/make-server-a9be5165/exams/*',
      admin: '/make-server-a9be5165/admin/*',
      guidelines: '/make-server-a9be5165/guidelines',
      health: '/make-server-a9be5165/health'
    }
  });
});

app.route('/make-server-a9be5165', questionsRoutes);
app.route('/make-server-a9be5165', authRoutes);
app.route('/make-server-a9be5165', examsRoutes);
app.route('/make-server-a9be5165', adminRoutes);
app.route('/make-server-a9be5165', userFeedbackRoutes);
app.route('/make-server-a9be5165', commentsRoutes);
app.route('/make-server-a9be5165', toursRoutes);
app.route('/make-server-a9be5165', testingFeedbackRoutes);
app.route('/make-server-a9be5165', guidelinesRoutes);
app.route('/make-server-a9be5165', userProfileRoutes);
console.log('✅ Routes mounted successfully (questions, auth, exams, admin, user-feedback, comments, tours, testing-feedback, guidelines, user-profile)!');

Deno.serve(app.fetch);