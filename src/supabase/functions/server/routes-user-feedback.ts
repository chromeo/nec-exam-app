import { Hono } from 'npm:hono';
import * as kv from './kv_store.ts';
import { Keys, KeyPatterns } from './keys.ts';
import type { UserFeedback } from './types.ts';
import { requireAdmin } from './auth-utils.ts';

const userFeedback = new Hono();

userFeedback.get('/admin/user-feedback', async (c) => {
  try {
    console.log('📋 routes-user-feedback.tsx: GET /admin/user-feedback');
    
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    // Get filter params
    const status = c.req.query('status');
    const questionId = c.req.query('questionId');

    let feedbackItems: UserFeedback[] = [];

    if (questionId) {
      // Get feedback for specific question via index
      const prefix = KeyPatterns.allUserFeedbackByQuestion(questionId);
      const indices = await kv.getByPrefix(prefix);
      
      console.log(`📊 Found ${indices.length} index entries for questionId: ${questionId}`);
      
      for (const index of indices) {
        const feedbackId = index.value?.feedbackId || index.feedbackId;
        if (!feedbackId) {
          console.warn('⚠️ Index entry missing feedbackId:', index);
          continue;
        }
        
        const feedback = await kv.get(Keys.userFeedback(feedbackId));
        if (feedback) {
          feedbackItems.push(feedback);
        } else {
          console.warn(`⚠️ Feedback not found for ID: ${feedbackId}`);
        }
      }
    } else {
      // Filter to ONLY main keys, exclude index keys
      console.log('📊 Fetching all user feedback (filtering out index keys)...');
      const allFeedbackRaw = await kv.getByPrefix(KeyPatterns.allUserFeedback());
      
      console.log(`📊 Total keys found: ${allFeedbackRaw.length}`);
      
      feedbackItems = allFeedbackRaw
        .filter(kvItem => {
          const key = kvItem.key || '';
          const colonCount = (key.match(/:/g) || []).length;
          
          // Only keep main keys (exactly 1 colon)
          return colonCount === 1;
        })
        .map(kvItem => {
          let feedback = kvItem.value;
          
          // Handle double-encoded JSON
          if (typeof feedback === 'string') {
            try {
              feedback = JSON.parse(feedback);
            } catch (e) {
              console.error('❌ Failed to parse feedback JSON for key:', kvItem.key, e);
              return null;
            }
          }
          
          // Validate feedback has required fields
          if (!feedback || !feedback.id) {
            console.warn('⚠️ Invalid feedback object for key:', kvItem.key);
            return null;
          }
          
          return feedback as UserFeedback | null;
        })
        .filter((f): f is UserFeedback => f !== null); // Remove any null values with a type guard
      
      console.log(`✅ Filtered to ${feedbackItems.length} main feedback items`);
    }

    // Filter by status if provided
    if (status) {
      const beforeFilterCount = feedbackItems.length;
      feedbackItems = feedbackItems.filter(f => f.status === status);
      console.log(`📊 Status filter (${status}): ${beforeFilterCount} → ${feedbackItems.length} items`);
    }

    // Sort by createdAt (newest first)
    feedbackItems.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    console.log(`✅ Returning ${feedbackItems.length} user feedback items`);

    return c.json({
      success: true,
      data: feedbackItems
    });

  } catch (error) {
    console.error('❌ Error fetching user feedback:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch user feedback'
    }, 500);
  }
});

userFeedback.patch('/admin/user-feedback/:id', async (c) => {
  try {
    const feedbackId = c.req.param('id');
    
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    // Strip prefix from ID
    const cleanFeedbackId = feedbackId.includes(':') ? 
      feedbackId.split(':').pop() || feedbackId : 
      feedbackId;

    // Get existing feedback
    const feedback = await kv.get(Keys.userFeedback(cleanFeedbackId));
    
    if (!feedback) {
      return c.json({
        success: false,
        error: 'Feedback not found'
      }, 404);
    }

    // Parse update data
    const body = await c.req.json();
    const { status, adminNotes } = body;

    // Update feedback
    const updatedFeedback = {
      ...feedback,
      status: status || feedback.status,
      adminNotes: adminNotes !== undefined ? adminNotes : feedback.adminNotes,
      reviewedAt: new Date().toISOString(),
      reviewedBy: authResult.user.id
    };

    // Save updated feedback
    await kv.set(Keys.userFeedback(cleanFeedbackId), updatedFeedback);
    
    console.log(`✅ Updated feedback ${cleanFeedbackId} - Status: ${updatedFeedback.status}`);

    return c.json({
      success: true,
      data: updatedFeedback
    });

  } catch (error) {
    console.error('❌ Error updating user feedback:', error);
    return c.json({
      success: false,
      error: 'Failed to update feedback'
    }, 500);
  }
});

userFeedback.delete('/admin/user-feedback/:id', async (c) => {
  try {
    const feedbackId = c.req.param('id');
    
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    // Strip prefix from ID
    const cleanFeedbackId = feedbackId.includes(':') ? 
      feedbackId.split(':').pop() || feedbackId : 
      feedbackId;

    // Check if feedback exists
    const feedback = await kv.get(Keys.userFeedback(cleanFeedbackId));
    
    if (!feedback) {
      return c.json({
        success: false,
        error: 'Feedback not found'
      }, 404);
    }

    // Delete feedback
    await kv.del(Keys.userFeedback(cleanFeedbackId));
    
    console.log(`✅ Deleted user feedback ${cleanFeedbackId}`);

    return c.json({
      success: true,
      data: {
        message: 'Feedback deleted successfully',
        deletedId: cleanFeedbackId
      }
    });

  } catch (error) {
    console.error('❌ Error deleting user feedback:', error);
    return c.json({
      success: false,
      error: 'Failed to delete feedback'
    }, 500);
  }
});

export default userFeedback;