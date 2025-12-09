// Server-side validation utilities
// Copy this code into your server to enable runtime validation

import { z } from 'zod';

// Server-compatible validation schemas (simplified for server environment)
const CommentUpdateRequestSchema = z.object({
  disposition: z.enum(['Under Review', 'Resolved', 'Rejected', 'In Progress']).optional(),
  response: z.object({
    content: z.string().min(1),
    adminUserId: z.string()
  }).optional(),
  metadata: z.record(z.any()).optional()
});

const QuestionFormSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correctAnswer: z.number().min(0),
  category: z.string().min(1),
  reference: z.string().optional(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  status: z.enum(['Draft', 'Final']).optional()
});

const TemplateFormSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  time_limit: z.number().min(1),
  question_count: z.number().min(1),
  category: z.string().min(1),
  moreDetails: z.string().optional(),
  price: z.number().min(0).optional(),
  questionCategories: z.record(z.number().min(0)).optional()
});

// Server validation helper
export function validateServerRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError && error.errors && Array.isArray(error.errors)) {
      const errorMessage = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      return { success: false, error: `Validation failed: ${errorMessage}` };
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
    return { success: false, error: errorMessage };
  }
}

// Example usage in your server endpoints:
/*
// In your comment update endpoint:
app.put('/admin/comments/:id', async (c) => {
  const body = await c.req.json();
  
  // Validate request
  const validation = validateServerRequest(CommentUpdateRequestSchema, body);
  if (!validation.success) {
    return c.json({ 
      success: false, 
      error: validation.error 
    }, 400);
  }
  
  // Use validated data
  const { disposition, response, metadata } = validation.data;
  // ... rest of your endpoint logic
});

// In your question create/update endpoint:
app.post('/admin/questions', async (c) => {
  const body = await c.req.json();
  
  // Validate request
  const validation = validateServerRequest(QuestionFormSchema, body);
  if (!validation.success) {
    return c.json({ 
      success: false, 
      error: validation.error 
    }, 400);
  }
  
  // Use validated data
  const questionData = validation.data;
  // ... rest of your endpoint logic
});
*/

export {
  CommentUpdateRequestSchema,
  QuestionFormSchema,
  TemplateFormSchema
};