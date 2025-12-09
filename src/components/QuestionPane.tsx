import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import {
  Flag,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Bookmark,
} from "lucide-react";
import { cn } from "./ui/utils";

interface Question {
  id: string;
  question: string;
  options: string[];
  category?: string;
  createdAt?: string;
}

interface QuestionPaneProps {
  question: Question;
  selectedAnswer: number | null;
  onAnswerSelect: (answerIndex: number) => void;
  onSave: () => void;
  onEdit: () => void;
  onFlag: () => void;
  onBookmark: () => void;
  onComment: (comment: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isFlagged: boolean;
  isBookmarked: boolean;
  questionNumber: number;
  currentComment: string;
  isEditMode: boolean;
  hasExistingAnswer: boolean;
  showEliminatorCheckboxes: boolean;
  eliminatedAnswers: Set<number>;
  onToggleElimination: (answerIndex: number) => void;
}

export function QuestionPane({
  question,
  selectedAnswer,
  onAnswerSelect,
  onSave,
  onEdit,
  onFlag,
  onBookmark,
  onComment,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  isFlagged,
  isBookmarked,
  questionNumber,
  currentComment,
  isEditMode,
  hasExistingAnswer,
  showEliminatorCheckboxes,
  eliminatedAnswers,
  onToggleElimination,
}: QuestionPaneProps) {
  const [isCommentDialogOpen, setIsCommentDialogOpen] =
    useState(false);
  const [commentText, setCommentText] =
    useState(currentComment);

  const handleCommentSave = () => {
    onComment(commentText);
    setIsCommentDialogOpen(false);
  };

  const remainingChars = 250 - commentText.length;
  return (
    <div className="flex-1 bg-background flex flex-col">
      {/* Question Header */}
      <div className="p-6 border-b border-border flex items-center justify-between bg-card">
        <h2 className="text-xl text-foreground">Question #{questionNumber}</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant={isFlagged ? "destructive" : "outline"}
            size="sm"
            onClick={onFlag}
            className={cn(
              "flex items-center space-x-2",
              isFlagged && currentComment && "relative",
            )}
          >
            <Flag className="h-4 w-4" />
            <span>Flag</span>
            {isFlagged && currentComment && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
            )}
          </Button>

          <Button
            variant={isBookmarked ? "default" : "outline"}
            size="sm"
            onClick={onBookmark}
            className="flex items-center space-x-2"
          >
            <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} />
            <span>Bookmark</span>
          </Button>

          <Dialog
            open={isCommentDialogOpen}
            onOpenChange={setIsCommentDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                variant={currentComment ? "default" : "outline"}
                size="sm"
                className={cn(
                  "flex items-center space-x-2",
                  currentComment && isFlagged && "relative",
                )}
                onClick={() => setCommentText(currentComment)}
              >
                <MessageSquare className="h-4 w-4" />
                <span>Comment</span>
                {currentComment && isFlagged && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  Add Comment for Question #{questionNumber}
                </DialogTitle>
                <DialogDescription>
                  Add a comment for the test proctor to review.
                  This will only be visible to the admin
                  personnel.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Enter your comment here..."
                    value={commentText}
                    onChange={(e) => {
                      if (e.target.value.length <= 250) {
                        setCommentText(e.target.value);
                      }
                    }}
                    className="min-h-[100px]"
                    maxLength={250}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Comment for test proctor review</span>
                    <span
                      className={cn(
                        remainingChars < 50 &&
                          remainingChars >= 10
                          ? "text-yellow-600"
                          : "",
                        remainingChars < 10
                          ? "text-red-600"
                          : "",
                      )}
                    >
                      {remainingChars} characters remaining
                    </span>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setIsCommentDialogOpen(false)
                    }
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCommentSave}>
                    Save Comment
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Question Content */}
      <div className="flex-1 p-6 flex flex-col bg-background">
        <div className="mb-6">
          <p className="mb-6 text-foreground">{question.question}</p>

          <div className="space-y-3">
            {question.options.map((option, index) => {
              const canSelect = (isEditMode || !hasExistingAnswer) && !eliminatedAnswers.has(index);
              const isEliminated = eliminatedAnswers.has(index);
              
              return (
                <div key={index} className="flex items-center space-x-3">
                  <Card
                    className={cn(
                      "p-4 border-2 transition-all duration-300 flex-none bg-card",
                      "w-[50%]", // 50% width as requested
                      selectedAnswer === index
                        ? "border-blue-500 bg-blue-100 dark:bg-blue-900/30"
                        : "border-border",
                      canSelect 
                        ? "cursor-pointer hover:border-muted-foreground dark:hover:border-primary/50" 
                        : "cursor-not-allowed",
                      isEliminated && "opacity-30 bg-muted dark:bg-muted/50"
                    )}
                    onClick={() => canSelect && onAnswerSelect(index)}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={cn(
                          "w-5 h-5 shrink-0 rounded-sm border-2 flex items-center justify-center transition-colors",
                          selectedAnswer === index && !isEliminated
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/40 bg-background hover:bg-accent hover:border-muted-foreground/60",
                        )}
                      >
                        {selectedAnswer === index && !isEliminated && (
                          <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                        )}
                      </div>
                      <span className={cn(
                        "text-foreground",
                        isEliminated && "line-through text-muted-foreground"
                      )}>
                        {String.fromCharCode(65 + index)}) {option}
                      </span>
                    </div>
                  </Card>
                  
                  {/* Elimination checkbox */}
                  {showEliminatorCheckboxes && (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`eliminate-${index}`}
                        checked={eliminatedAnswers.has(index)}
                        onChange={() => onToggleElimination(index)}
                        className="w-4 h-4 text-red-600 bg-input border-border rounded focus:ring-red-500 focus:ring-2 dark:bg-muted dark:border-muted-foreground"
                      />
                      <label 
                        htmlFor={`eliminate-${index}`}
                        className="ml-2 text-sm text-muted-foreground cursor-pointer"
                      >
                        Eliminate
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="mt-auto flex items-center justify-between">
          <div className="flex space-x-3">
            {!hasExistingAnswer ? (
              <Button
                onClick={onSave}
                disabled={selectedAnswer === null}
                className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                Save
              </Button>
            ) : !isEditMode ? (
              <Button
                onClick={onEdit}
                variant="outline"
              >
                Edit
              </Button>
            ) : (
              <Button
                onClick={onSave}
                disabled={selectedAnswer === null}
                className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                Save
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevious}
              disabled={!canGoPrevious}
              className="flex items-center space-x-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Prev</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNext}
              disabled={!canGoNext}
              className="flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}