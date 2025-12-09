import { Hono } from 'npm:hono';
import * as kv from './kv_store.ts';
import { Keys, KeyPatterns, generateId, KeyUtils } from './keys.ts';

// Import shared auth utilities
import { requireAdmin } from './auth-utils.ts';

const testingFeedback = new Hono();

console.log('🧪 Testing Feedback routes module loaded');

// ========================================
// TESTING FEEDBACK ENDPOINTS
// ========================================

// OPTIONS endpoint for CORS
testingFeedback.options('/testing-feedback', (c) => {
  return c.text('', 200);
});

// POST: Submit testing feedback
testingFeedback.post('/testing-feedback', async (c) => {
  try {
    const feedback = await c.req.json();

    console.log('📝 routes-testing-feedback.tsx: Submitting testing feedback:', feedback.id);

    // Validate top-level required fields
    if (!feedback.id || !feedback.version || !feedback.data) {
      console.error('❌ Missing top-level required fields:', {
        hasId: !!feedback.id,
        hasVersion: !!feedback.version,
        hasData: !!feedback.data,
      });
      return c.json({
        success: false,
        error: 'Missing required fields: id, version, data'
      }, 400);
    }
    
    // testerName is optional at server level (frontend validates before submit)
    if (feedback.testerName !== undefined && typeof feedback.testerName !== 'string') {
      console.error('❌ Invalid testerName type:', typeof feedback.testerName);
      return c.json({
        success: false,
        error: 'Invalid field type: testerName must be a string'
      }, 400);
    }

    // Validate data.sections exists and is an array
    if (!feedback.data.sections || !Array.isArray(feedback.data.sections)) {
      console.error('❌ Invalid data.sections:', {
        hasSections: !!feedback.data.sections,
        isArray: Array.isArray(feedback.data.sections),
        type: typeof feedback.data.sections,
      });
      return c.json({
        success: false,
        error: 'Invalid data structure: data.sections must be an array'
      }, 400);
    }

    // Validate sections array is not empty
    if (feedback.data.sections.length === 0) {
      console.warn('⚠️ Empty sections array submitted');
      return c.json({
        success: false,
        error: 'Invalid data: data.sections cannot be empty'
      }, 400);
    }

    // Validate each section has required structure
    for (let i = 0; i < feedback.data.sections.length; i++) {
      const section = feedback.data.sections[i];
      
      if (!section || typeof section !== 'object') {
        console.error(`❌ Section ${i} is not an object:`, section);
        return c.json({
          success: false,
          error: `Invalid section at index ${i}: must be an object`
        }, 400);
      }
      
      if (!section.id || typeof section.id !== 'string') {
        console.error(`❌ Section ${i} missing valid id:`, section);
        return c.json({
          success: false,
          error: `Invalid section at index ${i}: missing or invalid 'id' field`
        }, 400);
      }

      if (!section.title || typeof section.title !== 'string') {
        console.error(`❌ Section ${i} missing valid title:`, section);
        return c.json({
          success: false,
          error: `Invalid section at index ${i}: missing or invalid 'title' field`
        }, 400);
      }

      if (!Array.isArray(section.items)) {
        console.error(`❌ Section ${i} items is not an array:`, section);
        return c.json({
          success: false,
          error: `Invalid section at index ${i}: 'items' must be an array`
        }, 400);
      }
      
      // notes is optional but must be string if provided
      if (section.notes !== undefined && typeof section.notes !== 'string') {
        console.error(`❌ Section ${i} notes is not a string:`, typeof section.notes);
        return c.json({
          success: false,
          error: `Invalid section at index ${i}: 'notes' must be a string`
        }, 400);
      }

      // Validate each item has required structure (can all be 'untested'!)
      for (let j = 0; j < section.items.length; j++) {
        const item = section.items[j];
        
        if (!item || typeof item !== 'object') {
          console.error(`❌ Section ${i}, Item ${j} is not an object:`, item);
          return c.json({
            success: false,
            error: `Invalid item in section '${section.id}' at index ${j}: must be an object`
          }, 400);
        }
        
        if (!item.id || typeof item.id !== 'string') {
          console.error(`❌ Section ${i}, Item ${j} missing valid id:`, item);
          return c.json({
            success: false,
            error: `Invalid item in section '${section.id}' at index ${j}: missing 'id'`
          }, 400);
        }

        if (!item.text || typeof item.text !== 'string') {
          console.error(`❌ Section ${i}, Item ${j} missing valid text:`, item);
          return c.json({
            success: false,
            error: `Invalid item in section '${section.id}' at index ${j}: missing 'text'`
          }, 400);
        }

        const validStatuses = ['untested', 'yes', 'partial', 'no'];
        if (!item.status || !validStatuses.includes(item.status)) {
          console.error(`❌ Section ${i}, Item ${j} invalid status:`, item.status);
          return c.json({
            success: false,
            error: `Invalid item in section '${section.id}' at index ${j}: status must be one of [${validStatuses.join(', ')}]`
          }, 400);
        }

        // Comment is optional but must be string if provided (can be empty string)
        if (item.comment !== undefined && typeof item.comment !== 'string') {
          console.error(`❌ Section ${i}, Item ${j} invalid comment type:`, typeof item.comment);
          return c.json({
            success: false,
            error: `Invalid item in section '${section.id}' at index ${j}: comment must be a string`
          }, 400);
        }
      }
    }

    // All validation passed - store the feedback
    await kv.set(feedback.id, feedback);

    console.log('✅ Testing feedback stored successfully:', {
      id: feedback.id,
      version: feedback.version,
      testerName: feedback.testerName,
      sectionsCount: feedback.data.sections.length,
      totalItems: feedback.data.sections.reduce((sum, s) => sum + s.items.length, 0),
    });

    return c.json({
      success: true,
      message: 'Feedback submitted successfully',
      id: feedback.id
    });

  } catch (error) {
    console.error('❌ Error submitting testing feedback:', error);
    return c.json({
      success: false,
      error: 'Failed to submit testing feedback',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// GET: Retrieve all testing feedback (admin only)
testingFeedback.get('/testing-feedback', async (c) => {
  try {
    console.log('📊 routes-testing-feedback.tsx: Fetching all testing feedback...');

    // Require admin authentication
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    // Get all feedback entries using Keys infrastructure
    const rawEntries = await kv.getByPrefix(KeyPatterns.allTestingFeedback());
    
    // Extract values and add defensive logging
    const feedbackEntries = rawEntries.map((entry, idx) => {
      let feedback = entry.value;
      
      console.log(`🔍 Entry ${idx}: type=${typeof feedback}, key=${entry.key}`);
      
      // Handle old data that was stored as JSON string instead of JSONB object
      if (typeof feedback === 'string') {
        console.log(`  📝 Is string, parsing...`);
        try {
          feedback = JSON.parse(feedback);
          console.log(`  ✅ Parsed successfully, keys=${Object.keys(feedback).join(',')}`);
        } catch (e) {
          console.error(`  ❌ Failed to parse:`, e.message);
          return null;
        }
      } else {
        console.log(`  ℹ️ Already an object, keys=${Object.keys(feedback || {}).join(',')}`);
      }
      
      // Defensive check for structure
      const hasData = !!feedback?.data;
      const hasSections = !!feedback?.data?.sections;
      const isArray = Array.isArray(feedback?.data?.sections);
      
      console.log(`  🔍 Validation: hasData=${hasData}, hasSections=${hasSections}, isArray=${isArray}`);
      
      if (!feedback || !feedback.data || !Array.isArray(feedback.data.sections)) {
        console.warn(`  ⚠️ SKIPPING - failed validation`);
        return null;
      }
      
      console.log(`  ✅ VALID - including in results`);
      return feedback;
    }).filter(Boolean); // Remove null entries

    // Sort by submission date (newest first)
    const sortedFeedback = feedbackEntries.sort((a, b) => {
      const dateA = new Date(a.submittedAt || 0).getTime();
      const dateB = new Date(b.submittedAt || 0).getTime();
      return dateB - dateA;
    });

    console.log(`✅ Found ${sortedFeedback.length} feedback submissions`);

    return c.json({
      success: true,
      data: sortedFeedback,
      count: sortedFeedback.length
    });

  } catch (error) {
    console.error('❌ Error fetching testing feedback:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch testing feedback'
    }, 500);
  }
});

// GET: Retrieve feedback for specific version (admin only)
testingFeedback.get('/testing-feedback/:version', async (c) => {
  try {
    const version = c.req.param('version');
    
    console.log('📊 routes-testing-feedback.tsx: Fetching testing feedback for version:', version);

    // Require admin authentication
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    // Get all feedback entries using Keys infrastructure
    const allFeedback = await kv.getByPrefix(KeyPatterns.allTestingFeedback());

    // Filter by version
    const versionFeedback = allFeedback.filter(f => f.version === version);

    console.log(`✅ Found ${versionFeedback.length} feedback submissions for version ${version}`);

    return c.json({
      success: true,
      data: versionFeedback,
      count: versionFeedback.length,
      version
    });

  } catch (error) {
    console.error('❌ Error fetching version feedback:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch version feedback'
    }, 500);
  }
});

// DELETE: Remove specific feedback submission (admin only)
testingFeedback.delete('/testing-feedback/:id', async (c) => {
  try {
    const feedbackId = c.req.param('id');
    
    console.log('🗑️ routes-testing-feedback.tsx: Deleting testing feedback:', feedbackId);

    // Require admin authentication
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    // Check if feedback exists
    const existing = await kv.get(feedbackId);
    if (!existing) {
      return c.json({
        success: false,
        error: 'Feedback not found'
      }, 404);
    }

    // Delete the feedback
    await kv.del(feedbackId);

    console.log('✅ Testing feedback deleted:', feedbackId);

    return c.json({
      success: true,
      message: 'Feedback deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting testing feedback:', error);
    return c.json({
      success: false,
      error: 'Failed to delete testing feedback'
    }, 500);
  }
});

// ========================================
// CHANGELOG ENDPOINTS
// ========================================

// OPTIONS endpoint for CORS
testingFeedback.options('/changelog', (c) => {
  return c.text('', 200);
});

// GET: Retrieve changelog entries
testingFeedback.get('/changelog', async (c) => {
  try {
    console.log('📋 routes-testing-feedback.tsx: Fetching changelog entries...');

    // Get all changelog entries using Keys infrastructure
    const entries = await kv.getByPrefix(KeyPatterns.allChangelog());

    // Sort by date (newest first)
    const sortedEntries = entries.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });

    console.log(`✅ Found ${sortedEntries.length} changelog entries`);

    return c.json({
      success: true,
      entries: sortedEntries,
      count: sortedEntries.length
    });

  } catch (error) {
    console.error('❌ Error fetching changelog:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch changelog'
    }, 500);
  }
});

// POST: Create changelog entry (admin only)
testingFeedback.post('/changelog', async (c) => {
  try {
    console.log('📝 routes-testing-feedback.tsx: Creating changelog entry');

    // Require admin authentication
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const entry = await c.req.json();

    // Validate required fields
    if (!entry.version || !entry.date || !entry.changes) {
      return c.json({
        success: false,
        error: 'Missing required fields: version, date, changes'
      }, 400);
    }

    // Generate ID using Keys infrastructure
    const rawId = entry.id ? KeyUtils.extractId(entry.id) : generateId();
    const id = Keys.changelog(rawId);
    const changelogEntry = {
      ...entry,
      id,
      createdAt: new Date().toISOString()
    };

    // Store changelog entry
    await kv.set(id, changelogEntry);

    console.log('✅ Changelog entry created:', id);

    return c.json({
      success: true,
      message: 'Changelog entry created successfully',
      entry: changelogEntry
    });

  } catch (error) {
    console.error('❌ Error creating changelog entry:', error);
    return c.json({
      success: false,
      error: 'Failed to create changelog entry'
    }, 500);
  }
});

// PUT: Update changelog entry (admin only)
testingFeedback.put('/changelog/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    console.log('📝 routes-testing-feedback.tsx: Updating changelog entry:', id);

    // Require admin authentication
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    const updates = await c.req.json();

    // Get existing entry
    const existing = await kv.get(id);
    if (!existing) {
      return c.json({
        success: false,
        error: 'Changelog entry not found'
      }, 404);
    }

    // Update entry
    const updated = {
      ...existing,
      ...updates,
      id, // Preserve ID
      updatedAt: new Date().toISOString()
    };

    await kv.set(id, updated);

    console.log('✅ Changelog entry updated:', id);

    return c.json({
      success: true,
      message: 'Changelog entry updated successfully',
      entry: updated
    });

  } catch (error) {
    console.error('❌ Error updating changelog entry:', error);
    return c.json({
      success: false,
      error: 'Failed to update changelog entry'
    }, 500);
  }
});

// DELETE: Remove changelog entry (admin only)
testingFeedback.delete('/changelog/:id', async (c) => {
  try {
    const id = c.req.param('id');

    console.log('🗑️ routes-testing-feedback.tsx: Deleting changelog entry:', id);

    // Require admin authentication
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authResult = await requireAdmin(accessToken);
    
    if (!authResult.isAdmin) {
      return c.json({
        success: false,
        error: authResult.error
      }, authResult.status);
    }

    // Check if entry exists
    const existing = await kv.get(id);
    if (!existing) {
      return c.json({
        success: false,
        error: 'Changelog entry not found'
      }, 404);
    }

    // Delete entry
    await kv.del(id);

    console.log('✅ Changelog entry deleted:', id);

    return c.json({
      success: true,
      message: 'Changelog entry deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting changelog entry:', error);
    return c.json({
      success: false,
      error: 'Failed to delete changelog entry'
    }, 500);
  }
});

export default testingFeedback;