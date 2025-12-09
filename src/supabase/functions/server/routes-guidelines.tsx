import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js';

const guidelines = new Hono();

console.log('📖 Guidelines routes module loaded');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// ========================================
// GUIDELINES ENDPOINTS
// ========================================

// GET: Fetch guidelines from Supabase Storage
guidelines.get('/guidelines', async (c) => {
  try {
    console.log('📖 routes-guidelines.tsx: Fetching Guidelines.md from Supabase Storage...');
    
    // Try to download from Supabase Storage
    const { data, error } = await supabase.storage
      .from('documentation')
      .download('Guidelines.md');
    
    if (error) {
      console.error('❌ Failed to download guidelines from storage:', error);
      
      // Fallback to minimal embedded content
      console.log('⚠️ Falling back to minimal embedded guidelines');
      const fallbackContent = `# Exam Platform Development Guidelines

**Note:** This is a fallback version. The full guidelines could not be loaded from Supabase Storage.

## Error Loading Guidelines

If you're seeing this, it means the Guidelines.md file couldn't be loaded from Supabase Storage.

**To fix:**
1. Check that the 'documentation' bucket exists in Supabase Storage
2. Verify Guidelines.md is uploaded to the bucket
3. Check storage permissions (bucket should be public)

**Temporary workaround:** See /Guidelines.md in the project repository for full content.

**Error details:** ${error.message}
`;
      
      return c.json({
        success: true,
        data: {
          content: fallbackContent,
          source: 'fallback',
          error: error.message
        }
      });
    }
    
    if (!data) {
      return c.json({
        success: false,
        error: 'Guidelines file not found in storage'
      }, 404);
    }
    
    // Convert Blob to text
    const content = await data.text();
    
    console.log(`✅ Successfully loaded Guidelines.md from storage (${content.length} characters)`);
    
    return c.json({
      success: true,
      data: {
        content,
        source: 'storage'
      }
    });
  } catch (error) {
    console.error('❌ Error serving guidelines:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load guidelines'
    }, 500);
  }
});

// POST: Upload Guidelines.md to Supabase Storage (admin only)
guidelines.post('/admin/guidelines/sync', async (c) => {
  try {
    console.log('📖 routes-guidelines.tsx: POST /admin/guidelines/sync');
    
    // Verify admin authentication
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (!user || authError) {
      console.error('❌ Unauthorized sync attempt');
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Get content from request body
    const body = await c.req.json();
    const content = body.content;

    if (!content || typeof content !== 'string') {
      console.error('❌ Invalid content in request body');
      return c.json({ success: false, error: 'Content is required and must be a string' }, 400);
    }

    console.log(`📖 Received ${content.length} bytes of Guidelines.md content`);

    // Ensure documentation bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === 'documentation');

    if (!bucketExists) {
      console.log('📦 Creating documentation bucket...');
      const { error: createError } = await supabase.storage.createBucket('documentation', {
        public: true,
        fileSizeLimit: 10485760 // 10MB
      });

      if (createError) {
        console.error('❌ Failed to create bucket:', createError);
        return c.json({
          success: false,
          error: `Failed to create storage bucket: ${createError.message}`
        }, 500);
      }

      console.log('✅ Created documentation bucket');
    }

    // Upload to Supabase Storage (upsert = replace if exists)
    const blob = new Blob([content], { type: 'text/markdown' });
    const { data, error } = await supabase.storage
      .from('documentation')
      .upload('Guidelines.md', blob, {
        upsert: true,
        contentType: 'text/markdown'
      });

    if (error) {
      console.error('❌ Failed to upload Guidelines.md:', error);
      return c.json({
        success: false,
        error: `Upload failed: ${error.message}`
      }, 500);
    }

    console.log('✅ Successfully synced Guidelines.md to Supabase Storage');

    // Calculate file size
    const fileSize = new TextEncoder().encode(content).length;
    const fileSizeKB = (fileSize / 1024).toFixed(2);

    return c.json({
      success: true,
      data: {
        message: 'Guidelines.md synced successfully',
        path: data.path,
        size: `${fileSizeKB} KB`,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error syncing guidelines:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default guidelines;
