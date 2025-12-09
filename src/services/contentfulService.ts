/**
 * Contentful CMS Service
 * 
 * Industry-standard headless CMS integration using server-side proxy.
 * This replaces custom content management with a battle-tested solution.
 * 
 * Architecture:
 * - Frontend calls our server endpoint
 * - Server fetches from Contentful (keeps API keys secure)
 * - Fallback to defaults if Contentful is unavailable
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

// No direct Contentful client needed - we use server proxy instead
// This keeps API keys secure on the server

/**
 * Landing Page Content Model
 * Matches the Contentful content type structure
 */
export interface LandingPageContent {
  // Hero Section
  heroTitle: string;
  heroSubtitle: string;
  heroCtaText: string;
  heroDemoText: string;
  heroImage?: string;

  // Features Section
  featuresTitle: string;
  features: Array<{
    title: string;
    description: string;
    icon: string; // lucide-react icon name
  }>;

  // Benefits Section
  benefitsTitle: string;
  benefits: Array<{
    title: string;
    description: string;
    icon: string;
  }>;

  // Testimonials Section (optional)
  testimonialsTitle?: string;
  testimonials?: Array<{
    quote: string;
    author: string;
    role: string;
  }>;

  // CTA Section
  ctaTitle: string;
  ctaDescription: string;
  ctaButtonText: string;

  // Meta
  pageTitle: string;
  metaDescription: string;
}

/**
 * Default fallback content
 * Used when Contentful is not configured or fails to load
 */
const defaultLandingPageContent: LandingPageContent = {
  heroTitle: 'Master Your Exam Preparation',
  heroSubtitle: 'Professional exam preparation platform with comprehensive practice tests, detailed analytics, and personalized study plans.',
  heroCtaText: 'Get Started',
  heroDemoText: 'Try Demo',
  
  featuresTitle: 'Everything You Need to Succeed',
  features: [
    {
      title: 'Comprehensive Question Bank',
      description: 'Access thousands of practice questions organized by category and difficulty level.',
      icon: 'BookOpen'
    },
    {
      title: 'Realistic Exam Simulation',
      description: 'Practice with timed exams that mirror the real testing experience.',
      icon: 'Clock'
    },
    {
      title: 'Detailed Performance Analytics',
      description: 'Track your progress with comprehensive analytics and identify areas for improvement.',
      icon: 'BarChart3'
    },
    {
      title: 'Personalized Study Plans',
      description: 'Get customized study recommendations based on your performance.',
      icon: 'Target'
    }
  ],

  benefitsTitle: 'Why Choose Our Platform',
  benefits: [
    {
      title: 'Study Anywhere, Anytime',
      description: 'Access your exams and study materials from any device, at your own pace.',
      icon: 'Smartphone'
    },
    {
      title: 'Expert-Curated Content',
      description: 'All questions are carefully crafted and reviewed by industry professionals.',
      icon: 'Award'
    },
    {
      title: 'Progress Tracking',
      description: 'Monitor your improvement over time with detailed performance metrics.',
      icon: 'TrendingUp'
    }
  ],

  ctaTitle: 'Ready to Start Your Journey?',
  ctaDescription: 'Join thousands of successful exam takers who trust our platform.',
  ctaButtonText: 'Sign Up Now',

  pageTitle: 'Exam Preparation Platform',
  metaDescription: 'Professional exam preparation with comprehensive practice tests and detailed analytics.'
};

/**
 * Fetch Landing Page content from Contentful via server proxy
 * 
 * @returns Landing page content or fallback default
 */
export async function getLandingPageContent(): Promise<LandingPageContent> {
  try {
    console.log('🔄 Fetching landing page content from server...');

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165/contentful/landing-page`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.info('ℹ️ Contentful service unavailable, using default content');
      return defaultLandingPageContent;
    }

    const result = await response.json();

    // If server says to use defaults, do so
    if (!result.success || result.useDefaults) {
      console.info('ℹ️ Using default landing page content');
      return defaultLandingPageContent;
    }

    const fields = result.data;

    // Map server response to our content model, with fallbacks
    const content: LandingPageContent = {
      heroTitle: fields.heroTitle || defaultLandingPageContent.heroTitle,
      heroSubtitle: fields.heroSubtitle || defaultLandingPageContent.heroSubtitle,
      heroCtaText: fields.heroCtaText || defaultLandingPageContent.heroCtaText,
      heroDemoText: fields.heroDemoText || defaultLandingPageContent.heroDemoText,
      heroImage: fields.heroImage,

      featuresTitle: fields.featuresTitle || defaultLandingPageContent.featuresTitle,
      features: fields.features || defaultLandingPageContent.features,

      benefitsTitle: fields.benefitsTitle || defaultLandingPageContent.benefitsTitle,
      benefits: fields.benefits || defaultLandingPageContent.benefits,

      testimonialsTitle: fields.testimonialsTitle,
      testimonials: fields.testimonials,

      ctaTitle: fields.ctaTitle || defaultLandingPageContent.ctaTitle,
      ctaDescription: fields.ctaDescription || defaultLandingPageContent.ctaDescription,
      ctaButtonText: fields.ctaButtonText || defaultLandingPageContent.ctaButtonText,

      pageTitle: fields.pageTitle || defaultLandingPageContent.pageTitle,
      metaDescription: fields.metaDescription || defaultLandingPageContent.metaDescription,
    };

    console.log('✅ Landing page content loaded from Contentful');
    return content;

  } catch (error) {
    // Silent fallback - this is expected when Contentful is not configured
    console.info('ℹ️ Contentful not configured, using default landing page content');
    return defaultLandingPageContent;
  }
}

/**
 * Get the default content (for testing or fallback)
 */
export function getDefaultLandingPageContent(): LandingPageContent {
  return defaultLandingPageContent;
}