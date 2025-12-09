import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

type CommentCategory = 'Uncategorized' | 'Spelling' | 'Flawed Logic' | 'Poor Structure';

interface CommentData {
  text: string;
  category: CommentCategory;
}

interface QuestionCommentDialogProps {
  currentComment: string;
  currentCategory?: CommentCategory;
  onCommentSave: (commentData: CommentData) => void;
  questionNumber: number;
}

export const QuestionCommentDialog: React.FC<QuestionCommentDialogProps> = ({
  currentComment,
  currentCategory,
  onCommentSave,
  questionNumber,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [commentText, setCommentText] = useState(currentComment);
  const [category, setCategory] = useState<CommentCategory>(currentCategory || 'Uncategorized');

  const MAX_CHARS = 250;

  const handleSave = () => {
    onCommentSave({ text: commentText, category });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setCommentText(currentComment); // Reset to current value when opening
      setCategory(currentCategory || 'Uncategorized');
    }
    setIsOpen(open);
  };

  const currentLength = commentText.trim().length;
  const remainingChars = MAX_CHARS - commentText.length;
  const isValid = currentLength > 0 && commentText.length <= MAX_CHARS;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant={currentComment ? "default" : "outline"}
          size="sm"
          className="flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          Comment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Add Comment for Question #{questionNumber}
          </DialogTitle>
          <DialogDescription>
            Add a comment for the test proctor to review.
            This will only be visible to admin personnel.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category (Optional)</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as CommentCategory)}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                <SelectItem value="Spelling">Spelling</SelectItem>
                <SelectItem value="Flawed Logic">Flawed Logic</SelectItem>
                <SelectItem value="Poor Structure">Poor Structure</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              placeholder="Enter your comment here..."
              value={commentText}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) {
                  setCommentText(e.target.value);
                }
              }}
              className="min-h-[100px]"
              maxLength={MAX_CHARS}
            />
            <div className="flex justify-between text-xs gap-2">
              <span className="text-muted-foreground">
                Comment for test proctor review
              </span>
              <span
                className={`flex-shrink-0 ${
                  remainingChars < 50
                    ? "text-yellow-600 dark:text-yellow-500"
                    : remainingChars < 10
                    ? "text-red-600 dark:text-red-500"
                    : "text-muted-foreground"
                }`}
              >
                {commentText.length}/{MAX_CHARS}
              </span>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!isValid}
            >
              Save Comment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
