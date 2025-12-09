/**
 * ALTERNATIVE FEEDBACK UI DESIGNS
 * 
 * These are alternative designs for gathering user feedback that are less
 * intimidating than a full testing checklist. Can be used for A/B testing
 * to determine which approach gets more user engagement.
 * 
 * Created: November 28, 2025
 * Status: Not currently in use - candidates for future A/B testing
 */

import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ChevronDown, Send, Bug, Lightbulb, MessageSquare, Star } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// ============================================================================
// OPTION 1: SIMPLE TEXT BOX WITH OPTIONAL PROMPTS
// ============================================================================

interface SimpleTextBoxFeedbackProps {
  onSubmit?: (feedback: string) => void;
}

export function SimpleTextBoxFeedback({ onSubmit }: SimpleTextBoxFeedbackProps) {
  const [feedback, setFeedback] = useState('');
  const [showPrompts, setShowPrompts] = useState(false);

  const prompts = [
    "What feature would make your exam experience better?",
    "Was anything confusing or hard to use?",
    "What did you like most about the platform?",
    "Did you encounter any bugs or errors?",
    "How could we improve the exam interface?",
    "Was the exam timer clear and easy to understand?",
  ];

  const handleSubmit = () => {
    if (!feedback.trim()) {
      toast.error('Please enter some feedback before submitting');
      return;
    }
    
    onSubmit?.(feedback);
    toast.success('Thanks for your feedback! 🎉');
    setFeedback('');
  };

  const handlePromptClick = (prompt: string) => {
    setFeedback(prev => prev ? `${prev}\n\n${prompt}\n` : `${prompt}\n`);
  };

  return (
    <div className="flex h-full w-full flex-col p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Share Your Feedback</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Any feedback helps - share as much or as little as you like
        </p>
      </div>

      {/* Main Text Box - THE HERO */}
      <div className="flex-1 flex flex-col space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            What's on your mind?
          </label>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell us about your experience, suggest improvements, report bugs - whatever you'd like to share..."
            className="min-h-[200px] resize-none"
          />
        </div>

        {/* Optional Prompts - Collapsed by Default */}
        <Collapsible open={showPrompts} onOpenChange={setShowPrompts}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-muted-foreground">
              <span className="text-sm">Need ideas? Click here for prompts</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showPrompts ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            <p className="text-xs text-muted-foreground mb-2">Click a prompt to add it to your feedback:</p>
            <div className="grid gap-2">
              {prompts.map((prompt, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePromptClick(prompt)}
                  className="justify-start h-auto py-2 px-3 text-left whitespace-normal"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Submit Button */}
      <Button 
        onClick={handleSubmit} 
        size="lg" 
        className="w-full"
        disabled={!feedback.trim()}
      >
        <Send className="h-4 w-4 mr-2" />
        Submit Feedback
      </Button>
    </div>
  );
}

// ============================================================================
// OPTION 2: CATEGORY-BASED FEEDBACK
// ============================================================================

type FeedbackCategory = 'bug' | 'feature' | 'general' | 'compliment';

interface CategoryBasedFeedbackProps {
  onSubmit?: (category: FeedbackCategory, feedback: string) => void;
}

export function CategoryBasedFeedback({ onSubmit }: CategoryBasedFeedbackProps) {
  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory | null>(null);
  const [feedback, setFeedback] = useState('');

  const categories = [
    {
      id: 'bug' as FeedbackCategory,
      icon: Bug,
      title: 'Report a Bug',
      description: 'Something not working right?',
      placeholder: 'Describe what happened and what you expected...',
      color: 'text-red-500',
    },
    {
      id: 'feature' as FeedbackCategory,
      icon: Lightbulb,
      title: 'Suggest Feature',
      description: 'Have an idea to share?',
      placeholder: 'Tell us about the feature you\'d like to see...',
      color: 'text-yellow-500',
    },
    {
      id: 'general' as FeedbackCategory,
      icon: MessageSquare,
      title: 'General Feedback',
      description: 'Share your thoughts',
      placeholder: 'What would you like to tell us?',
      color: 'text-blue-500',
    },
    {
      id: 'compliment' as FeedbackCategory,
      icon: Star,
      title: 'Give Kudos',
      description: 'Let us know what you love!',
      placeholder: 'What did you enjoy about the platform?',
      color: 'text-green-500',
    },
  ];

  const handleSubmit = () => {
    if (!selectedCategory || !feedback.trim()) {
      toast.error('Please select a category and enter your feedback');
      return;
    }

    onSubmit?.(selectedCategory, feedback);
    toast.success('Thanks for your feedback! 🎉');
    setSelectedCategory(null);
    setFeedback('');
  };

  const handleBack = () => {
    setSelectedCategory(null);
    setFeedback('');
  };

  // Category Selection Screen
  if (!selectedCategory) {
    return (
      <div className="flex h-full w-full flex-col p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Share Feedback</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            What would you like to share with us?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Card
                key={category.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedCategory(category.id)}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <Icon className={`h-6 w-6 ${category.color}`} />
                    <div>
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                      <CardDescription className="mt-1">{category.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Feedback Form Screen
  const currentCategory = categories.find(c => c.id === selectedCategory)!;
  const Icon = currentCategory.icon;

  return (
    <div className="flex h-full w-full flex-col p-6 space-y-6">
      {/* Header with Back Button */}
      <div className="space-y-4">
        <Button variant="ghost" onClick={handleBack}>
          ← Back to categories
        </Button>
        <div className="flex items-start gap-3">
          <Icon className={`h-6 w-6 ${currentCategory.color}`} />
          <div>
            <h1 className="text-2xl font-semibold">{currentCategory.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {currentCategory.description}
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Text Box */}
      <div className="flex-1 flex flex-col">
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={currentCategory.placeholder}
          className="flex-1 min-h-[200px] resize-none"
          autoFocus
        />
      </div>

      {/* Submit Button */}
      <Button 
        onClick={handleSubmit} 
        size="lg" 
        className="w-full"
        disabled={!feedback.trim()}
      >
        <Send className="h-4 w-4 mr-2" />
        Submit {currentCategory.title}
      </Button>
    </div>
  );
}

// ============================================================================
// OPTION 3: EMOJI RATING + OPTIONAL COMMENT
// ============================================================================

interface EmojiRatingFeedbackProps {
  onSubmit?: (rating: number, comment?: string) => void;
}

export function EmojiRatingFeedback({ onSubmit }: EmojiRatingFeedbackProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);

  const ratings = [
    { value: 1, emoji: '😞', label: 'Poor' },
    { value: 2, emoji: '😕', label: 'Fair' },
    { value: 3, emoji: '😐', label: 'Okay' },
    { value: 4, emoji: '😊', label: 'Good' },
    { value: 5, emoji: '😍', label: 'Excellent' },
  ];

  const handleRatingClick = (value: number) => {
    setRating(value);
    setShowComment(true);
  };

  const handleSubmit = () => {
    if (rating === null) {
      toast.error('Please select a rating');
      return;
    }

    onSubmit?.(rating, comment || undefined);
    toast.success('Thanks for your feedback! 🎉');
    setRating(null);
    setComment('');
    setShowComment(false);
  };

  return (
    <div className="flex h-full w-full flex-col p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Quick Feedback</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          How was your experience?
        </p>
      </div>

      {/* Emoji Rating */}
      <div className="space-y-4">
        <div className="flex justify-center gap-4">
          {ratings.map((r) => (
            <button
              key={r.value}
              onClick={() => handleRatingClick(r.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all hover:bg-accent ${
                rating === r.value ? 'bg-primary/10 ring-2 ring-primary' : ''
              }`}
            >
              <span className="text-4xl">{r.emoji}</span>
              <span className="text-xs font-medium">{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Optional Comment */}
      {showComment && (
        <div className="flex-1 flex flex-col space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Tell us more (optional)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What made you feel this way? Any suggestions?"
              className="min-h-[120px] resize-none"
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            size="lg" 
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            Submit Feedback
          </Button>
        </div>
      )}

      {!showComment && rating !== null && (
        <Button 
          onClick={handleSubmit} 
          size="lg" 
          className="w-full"
        >
          Submit Rating
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// USAGE EXAMPLES & NOTES
// ============================================================================

/*
USAGE:

Replace TestingChecklist in FeedbackButton.tsx with one of these components:

// Option 1: Simple text box (least intimidating, highest completion rate)
<SimpleTextBoxFeedback 
  onSubmit={(feedback) => {
    // Save to database
    console.log('Feedback:', feedback);
  }} 
/>

// Option 2: Category-based (good for structured feedback)
<CategoryBasedFeedback 
  onSubmit={(category, feedback) => {
    // Save with category tag
    console.log('Category:', category, 'Feedback:', feedback);
  }} 
/>

// Option 3: Emoji rating (fastest, great for quick sentiment)
<EmojiRatingFeedback 
  onSubmit={(rating, comment) => {
    // Save rating + optional comment
    console.log('Rating:', rating, 'Comment:', comment);
  }} 
/>

A/B TESTING RECOMMENDATIONS:

- Test Option 1 vs Current Checklist
  - Hypothesis: Simpler form = higher completion rate
  - Metrics: % who submit, avg feedback length, time spent

- Test Option 2 for bug reports
  - Hypothesis: Category helps users organize thoughts
  - Metrics: Bug report quality, actionable feedback %

- Test Option 3 for post-exam quick feedback
  - Hypothesis: Quick emoji = more responses
  - Metrics: Response rate, correlation with exam score

- Keep current TestingChecklist for admin users
  - They WANT detailed checklists
  - Great for comprehensive testing feedback
*/
