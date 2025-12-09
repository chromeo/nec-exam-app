import { Context } from 'npm:hono@4.6.3';
import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import * as kv from './kv_store.tsx';

// Tour interfaces matching the TourManagementSection component
interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  allowClickThrough?: boolean;
  order: number;
  isActive: boolean;
}

interface TourConfig {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  showForNewExams: boolean;
  showPreDialog: boolean;
  preDialogTitle: string;
  preDialogDescription: string;
  steps: TourStep[];
  createdAt: string;
  updatedAt: string;
}

// Initialize with a default tour if none exists
const defaultTour: TourConfig = {
  id: 'default-tour',
  name: 'Exam Interface Tour',
  description: 'A guided tour of the exam interface for new users',
  isDefault: true,
  showForNewExams: true,
  showPreDialog: true,
  preDialogTitle: 'Welcome to Your Exam',
  preDialogDescription: 'Would you like a quick guided tour of the exam interface before you begin?',
  steps: [
    {
      id: 'step-1',
      title: 'Question Area',
      description: 'This is where exam questions are displayed. Read each question carefully before selecting your answer.',
      targetSelector: '[data-tour="question-pane"]',
      position: 'right',
      allowClickThrough: false,
      order: 0,
      isActive: true
    },
    {
      id: 'step-2',
      title: 'Answer Choices',
      description: 'Select your answer by clicking on one of these options. You can change your answer anytime.',
      targetSelector: '[data-tour="answer-options"]',
      position: 'left',
      allowClickThrough: false,
      order: 1,
      isActive: true
    },
    {
      id: 'step-3',
      title: 'Question Navigation',
      description: 'Use these buttons to navigate between questions. The Index panel shows your progress.',
      targetSelector: '[data-tour="navigation-buttons"]',
      position: 'top',
      allowClickThrough: false,
      order: 2,
      isActive: true
    },
    {
      id: 'step-4',
      title: 'Timer',
      description: 'Keep track of your remaining time here. The timer turns red when time is running low.',
      targetSelector: '[data-tour="exam-timer"]',
      position: 'bottom',
      allowClickThrough: false,
      order: 3,
      isActive: true
    },
    {
      id: 'step-5',
      title: 'Tools',
      description: 'Access helpful tools like highlighter and answer eliminator from this dropdown.',
      targetSelector: '[data-tour="tools-dropdown"]',
      position: 'bottom',
      allowClickThrough: false,
      order: 4,
      isActive: true
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const handleGetTours = async (c: Context) => {
  try {
    console.log('📚 Getting all tours');
    
    // Get all tours from the key-value store
    const tours = await kv.getByPrefix('tour:');
    
    // If no tours exist, create the default tour
    if (tours.length === 0) {
      console.log('📚 No tours found, creating default tour');
      await kv.set(`tour:${defaultTour.id}`, defaultTour);
      return c.json({
        success: true,
        tours: [defaultTour]
      });
    }
    
    // Parse and sort tours
    const parsedTours = tours
      .map(entry => {
        try {
          return typeof entry.value === 'string' ? JSON.parse(entry.value) : entry.value;
        } catch (e) {
          console.error('Error parsing tour:', e);
          return null;
        }
      })
      .filter(Boolean)
      .sort((a: TourConfig, b: TourConfig) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    
    return c.json({
      success: true,
      tours: parsedTours
    });
    
  } catch (error) {
    console.error('Error getting tours:', error);
    return c.json({
      success: false,
      error: 'Failed to get tours'
    }, 500);
  }
};

export const handleCreateTour = async (c: Context) => {
  try {
    const tourData = await c.req.json();
    console.log('📚 Creating new tour:', tourData.name);
    
    const newTour: TourConfig = {
      ...tourData,
      id: `tour-${Date.now()}`,
      steps: tourData.steps || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // If this is set as default, unset other defaults
    if (newTour.isDefault) {
      const existingTours = await kv.getByPrefix('tour:');
      for (const tour of existingTours) {
        const tourConfig = typeof tour.value === 'string' ? JSON.parse(tour.value) : tour.value;
        if (tourConfig.isDefault) {
          tourConfig.isDefault = false;
          tourConfig.updatedAt = new Date().toISOString();
          await kv.set(tour.key, tourConfig);
        }
      }
    }
    
    await kv.set(`tour:${newTour.id}`, newTour);
    
    return c.json({
      success: true,
      tour: newTour
    });
    
  } catch (error) {
    console.error('Error creating tour:', error);
    return c.json({
      success: false,
      error: 'Failed to create tour'
    }, 500);
  }
};

export const handleUpdateTour = async (c: Context) => {
  try {
    const { tourId } = c.req.param();
    const updates = await c.req.json();
    console.log('📚 Updating tour:', tourId);
    
    // Get existing tour
    const existingTour = await kv.get(`tour:${tourId}`);
    if (!existingTour) {
      return c.json({
        success: false,
        error: 'Tour not found'
      }, 404);
    }
    
    const parsedTour = typeof existingTour === 'string' ? JSON.parse(existingTour) : existingTour;
    
    // If setting as default, unset other defaults
    if (updates.isDefault && !parsedTour.isDefault) {
      const existingTours = await kv.getByPrefix('tour:');
      for (const tour of existingTours) {
        if (tour.key === `tour:${tourId}`) continue;
        const tourConfig = typeof tour.value === 'string' ? JSON.parse(tour.value) : tour.value;
        if (tourConfig.isDefault) {
          tourConfig.isDefault = false;
          tourConfig.updatedAt = new Date().toISOString();
          await kv.set(tour.key, tourConfig);
        }
      }
    }
    
    const updatedTour = {
      ...parsedTour,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`tour:${tourId}`, updatedTour);
    
    return c.json({
      success: true,
      tour: updatedTour
    });
    
  } catch (error) {
    console.error('Error updating tour:', error);
    return c.json({
      success: false,
      error: 'Failed to update tour'
    }, 500);
  }
};

export const handleDeleteTour = async (c: Context) => {
  try {
    const { tourId } = c.req.param();
    console.log('📚 Deleting tour:', tourId);
    
    // Check if tour exists
    const existingTour = await kv.get(`tour:${tourId}`);
    if (!existingTour) {
      return c.json({
        success: false,
        error: 'Tour not found'
      }, 404);
    }
    
    await kv.del(`tour:${tourId}`);
    
    return c.json({
      success: true,
      message: 'Tour deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting tour:', error);
    return c.json({
      success: false,
      error: 'Failed to delete tour'
    }, 500);
  }
};

export const handleGetDefaultTour = async (c: Context) => {
  try {
    console.log('📚 Getting default tour');
    
    const tours = await kv.getByPrefix('tour:');
    const defaultTourEntry = tours.find(tour => {
      const tourConfig = typeof tour.value === 'string' ? JSON.parse(tour.value) : tour.value;
      return tourConfig.isDefault;
    });
    
    if (defaultTourEntry) {
      const parsedTour = typeof defaultTourEntry.value === 'string' 
        ? JSON.parse(defaultTourEntry.value) 
        : defaultTourEntry.value;
      
      return c.json({
        success: true,
        tour: parsedTour
      });
    }
    
    // No default tour found, return the built-in default
    return c.json({
      success: true,
      tour: defaultTour
    });
    
  } catch (error) {
    console.error('Error getting default tour:', error);
    return c.json({
      success: false,
      error: 'Failed to get default tour'
    }, 500);
  }
};