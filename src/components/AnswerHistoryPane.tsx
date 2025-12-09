import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { MessageSquare, Bookmark } from "lucide-react";

interface Question {
  id: string;
  question: string;
  options: string[];
  category?: string;
  createdAt?: string;
}

interface Answer {
  answer: number;
  flagged: boolean;
  bookmarked?: boolean;
}

interface AnswerHistoryPaneProps {
  questions: Question[];
  answers: { [key: string]: Answer };
  comments: { [key: string]: string };
  flags: { [key: string]: boolean };
  bookmarks: { [key: string]: boolean };
  currentQuestionIndex: number; // NEW: Add current question index to limit preview
  onQuestionClick: (questionId: string) => void;
}

type FilterType = 'all' | 'answered' | 'flagged' | 'bookmarked' | 'comments';

export function AnswerHistoryPane({
  questions,
  answers,
  comments,
  flags,
  bookmarks,
  currentQuestionIndex,
  onQuestionClick,
}: AnswerHistoryPaneProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  // Only consider questions that have been seen (up to current question index)
  const seenQuestions = questions.filter((_, index) => index <= currentQuestionIndex);

  const answeredQuestions = seenQuestions.filter(
    (q) => answers[q.id]?.answer !== undefined,
  );
  const flaggedQuestions = seenQuestions.filter(
    (q) => flags[q.id] || answers[q.id]?.flagged,
  );
  const bookmarkedQuestions = seenQuestions.filter(
    (q) => bookmarks[q.id] || answers[q.id]?.bookmarked,
  );
  const commentedQuestions = seenQuestions.filter((q) =>
    comments[q.id]?.trim(),
  );

  // Get all questions that have been interacted with (answered, flagged, bookmarked, or commented) from seen questions only
  const allInteractedQuestions = seenQuestions.filter(
    (q) => answers[q.id]?.answer !== undefined || flags[q.id] || answers[q.id]?.flagged || bookmarks[q.id] || answers[q.id]?.bookmarked || comments[q.id]?.trim()
  );

  // Filter questions based on selected filter
  const getFilteredQuestions = () => {
    switch (filter) {
      case 'answered':
        return answeredQuestions;
      case 'flagged':
        return flaggedQuestions;
      case 'bookmarked':
        return bookmarkedQuestions;
      case 'comments':
        return commentedQuestions;
      case 'all':
      default:
        return allInteractedQuestions;
    }
  };

  const recentAnswered = getFilteredQuestions();

  const getFilterTitle = () => {
    switch (filter) {
      case 'answered':
        return 'Answered Questions';
      case 'flagged':
        return 'Flagged Questions';
      case 'bookmarked':
        return 'Bookmarked Questions';
      case 'comments':
        return 'Questions with Comments';
      case 'all':
      default:
        return 'All Questions';
    }
  };

  const getEmptyMessage = () => {
    switch (filter) {
      case 'answered':
        return 'No questions answered yet from those you\'ve seen';
      case 'flagged':
        return 'No questions flagged yet from those you\'ve seen';
      case 'bookmarked':
        return 'No questions bookmarked yet from those you\'ve seen';
      case 'comments':
        return 'No questions with comments yet from those you\'ve seen';
      case 'all':
      default:
        return 'No questions to show yet from those you\'ve seen';
    }
  };

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Status Buttons */}
      <div className="p-4 border-b border-border space-y-2 bg-card">
        <div className="flex space-x-2">
          <Badge className="bg-primary hover:bg-primary/90 flex-1">
            Answered ({answeredQuestions.length})
          </Badge>
          <Badge variant="destructive" className="flex-1">
            Flagged ({flaggedQuestions.length})
          </Badge>
        </div>
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 flex items-center space-x-2"
          >
            <Bookmark className="h-4 w-4" />
            <span>Bookmarks ({bookmarkedQuestions.length})</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 flex items-center space-x-2"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Comments ({commentedQuestions.length})</span>
          </Button>
        </div>
      </div>

      {/* Question History */}
      <div className="flex-1 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm text-muted-foreground uppercase tracking-wide">
            {getFilterTitle()}
          </h3>
          <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="answered">Answered</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="bookmarked">Bookmarked</SelectItem>
              <SelectItem value="comments">Comments</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-y-auto space-y-4 max-h-[calc(80vh-8rem)] pr-2 scrollbar-enhanced">
          {recentAnswered.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {getEmptyMessage()}
            </p>
          ) : (
            recentAnswered.map((question, index) => {
              const answer = answers[question.id];
              const hasComment = comments[question.id]?.trim();
              const isFlagged = flags[question.id] || answer?.flagged;
              const isBookmarked = bookmarks[question.id] || answer?.bookmarked;
              
              // Get the question number from the original questions array
              const questionNumber = questions.findIndex(q => q.id === question.id) + 1;

              return (
                <Card 
                  key={question.id} 
                  className="p-4 bg-background cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onQuestionClick(question.id)}
                >
                  <h4 className="text-sm font-medium text-foreground hover:text-primary">
                    Question {questionNumber}
                  </h4>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex flex-wrap gap-1">
                      {answer?.answer !== undefined && (
                        <Badge
                          variant="default"
                          className="bg-primary"
                        >
                          Answered
                        </Badge>
                      )}
                      {isFlagged && (
                        <Badge 
                          variant="destructive" 
                          className="text-xs"
                        >
                          Flagged
                        </Badge>
                      )}
                      {isBookmarked && (
                        <Badge 
                          variant="secondary" 
                          className="text-xs"
                        >
                          Bookmarked
                        </Badge>
                      )}
                      {hasComment && (
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                        >
                          Comment
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {question.question}
                  </p>

                  <div className="space-y-2">
                    {answer?.answer !== undefined && (
                      <div className="text-sm">
                        <span className="font-medium">
                          Selected:{" "}
                        </span>
                        <span className="text-blue-600 dark:text-blue-400">
                          {String.fromCharCode(65 + answer.answer)}) {question.options[answer.answer]}
                        </span>
                      </div>
                    )}

                    {hasComment && (
                      <div className="text-xs bg-muted p-2 rounded border-l-2 border-blue-300 dark:border-blue-600">
                        <span className="font-medium text-foreground">
                          Comment:{" "}
                        </span>
                        <span className="text-muted-foreground">
                          {hasComment.length > 60
                            ? `${hasComment.substring(0, 60)}...`
                            : hasComment}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}

          {/* Help text */}
          {recentAnswered.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Click on any answered question to review or edit
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}