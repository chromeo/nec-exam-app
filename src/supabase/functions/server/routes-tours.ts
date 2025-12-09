import { Hono } from 'npm:hono';
import { requireAdmin } from './auth-utils.ts';
import { 
  handleGetTours, 
  handleCreateTour, 
  handleUpdateTour, 
  handleDeleteTour, 
  handleGetDefaultTour 
} from './tour-management.ts';

const tours = new Hono();

// Admin tour management endpoints
tours.get('/admin/tours', async (c) => {
  
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const authResult = await requireAdmin(accessToken);

  if (!authResult.isAdmin) {
    return c.json({
      success: false,
      error: authResult.error
    }, authResult.status);
  }
  
  return handleGetTours(c);
});

tours.post('/admin/tours', async (c) => {
  
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const authResult = await requireAdmin(accessToken);

  if (!authResult.isAdmin) {
    return c.json({
      success: false,
      error: authResult.error
    }, authResult.status);
  }
  
  return handleCreateTour(c);
});

tours.patch('/admin/tours/:tourId', async (c) => {
  
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const authResult = await requireAdmin(accessToken);

  if (!authResult.isAdmin) {
    return c.json({
      success: false,
      error: authResult.error
    }, authResult.status);
  }
  
  return handleUpdateTour(c);
});

tours.delete('/admin/tours/:tourId', async (c) => {
  
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const authResult = await requireAdmin(accessToken);

  if (!authResult.isAdmin) {
    return c.json({
      success: false,
      error: authResult.error
    }, authResult.status);
  }
  
  return handleDeleteTour(c);
});

// Public route for getting default tour (for exam interface)
tours.get('/tours/default', async (c) => {
  return handleGetDefaultTour(c);
});

export default tours;
