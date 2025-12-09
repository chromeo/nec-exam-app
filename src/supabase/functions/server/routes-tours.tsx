import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js';
import { 
  handleGetTours, 
  handleCreateTour, 
  handleUpdateTour, 
  handleDeleteTour, 
  handleGetDefaultTour 
} from './tour-management.ts';

const tours = new Hono();

console.log('🎯 Tours routes module loaded');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// ========================================
// TOUR MANAGEMENT ENDPOINTS
// ========================================

// Admin tour management endpoints
tours.get('/admin/tours', async (c) => {
  console.log('🎯 routes-tours.tsx: GET /admin/tours');
  
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (!user?.id) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }
  
  return handleGetTours(c);
});

tours.post('/admin/tours', async (c) => {
  console.log('🎯 routes-tours.tsx: POST /admin/tours');
  
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (!user?.id) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }
  
  return handleCreateTour(c);
});

tours.patch('/admin/tours/:tourId', async (c) => {
  console.log('🎯 routes-tours.tsx: PATCH /admin/tours/:tourId');
  
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (!user?.id) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }
  
  return handleUpdateTour(c);
});

tours.delete('/admin/tours/:tourId', async (c) => {
  console.log('🎯 routes-tours.tsx: DELETE /admin/tours/:tourId');
  
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (!user?.id) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }
  
  return handleDeleteTour(c);
});

// Public route for getting default tour (for exam interface)
tours.get('/tours/default', async (c) => {
  console.log('🎯 routes-tours.tsx: GET /tours/default');
  return handleGetDefaultTour(c);
});

export default tours;
