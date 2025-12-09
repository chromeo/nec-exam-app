import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';
import { VisuallyHidden } from './ui/visually-hidden';
import { TestingChecklist } from './TestingChecklist';

interface FeedbackButtonProps {
  /** Hide the button (e.g., during exam-taking to avoid distractions) */
  hidden?: boolean;
  /** Whether the user is an admin (shows admin checklist sections) */
  isAdmin?: boolean;
}

/**
 * Subtle vertical feedback button that appears on the right edge of the screen.
 * Opens a slide-out drawer with the feedback/testing checklist form.
 * 
 * Usage: Place this component at the root level of pages where feedback should be available.
 * Set hidden={true} during exam-taking screens (distracting during timed exams).
 */
export function FeedbackButton({ hidden = false, isAdmin = false }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (hidden) return null;

  return (
    <>
      {/* Subtle Vertical Tab Button - Fixed to right edge */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40
                   bg-transparent border border-border
                   px-1.5 py-4 rounded-l-md
                   hover:bg-accent/50 hover:border-accent-foreground/20
                   transition-all duration-200
                   flex items-center gap-1.5
                   group
                   shadow-sm"
        style={{ writingMode: 'vertical-rl' }}
        aria-label="Open feedback form"
      >
        <MessageSquare className="h-4 w-4 rotate-90 text-muted-foreground group-hover:text-foreground group-hover:scale-110 transition-all" />
        <span className="text-xs font-medium tracking-wide text-muted-foreground group-hover:text-foreground transition-colors">
          FEEDBACK
        </span>
      </button>

      {/* Slide-out Drawer from Right */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="right"
          style={{ width: '90vw', maxWidth: '90vw' }}
          className="p-0 overflow-hidden"
          aria-describedby={undefined}
        >
          {/* Accessibility: Visually hidden title since TestingChecklist has its own visible h1 */}
          <VisuallyHidden>
            <SheetTitle>Feedback - Any feedback helps</SheetTitle>
            <SheetDescription>Share your experience - as much or as little as you like. Every bit helps us improve.</SheetDescription>
          </VisuallyHidden>
          
          {/* TestingChecklist now manages its own full-height layout */}
          <TestingChecklist isAdmin={isAdmin} />
        </SheetContent>
      </Sheet>
    </>
  );
}
