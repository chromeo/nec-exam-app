import React, { memo, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Eye, Edit, Trash2 } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'multiple-choice' | 'true-false';
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

interface VirtualizedQuestionListProps {
  questions: Question[];
  onView?: (question: Question) => void;
  onEdit?: (question: Question) => void;
  onDelete?: (questionId: string) => void;
  height?: number;
  itemHeight?: number;
}

// Memoized question item component to prevent unnecessary re-renders
const QuestionItem = memo<{
  index: number;
  style: React.CSSProperties;
  data: {
    questions: Question[];
    onView?: (question: Question) => void;
    onEdit?: (question: Question) => void;
    onDelete?: (questionId: string) => void;
  };
}>(({ index, style, data }) => {
  const { questions, onView, onEdit, onDelete } = data;
  const question = questions[index];

  const handleView = useCallback(() => {
    onView?.(question);
  }, [onView, question]);

  const handleEdit = useCallback(() => {
    onEdit?.(question);
  }, [onEdit, question]);

  const handleDelete = useCallback(() => {
    onDelete?.(question.id);
  }, [onDelete, question.id]);

  const difficultyColor = useMemo(() => {
    switch (question.difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, [question.difficulty]);

  return (
    <div style={style} className="px-4 py-2">
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {question.category}
                </Badge>
                <Badge className={`text-xs ${difficultyColor}`}>
                  {question.difficulty}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {question.type}
                </Badge>
              </div>
              
              <p className="text-sm text-foreground line-clamp-2 mb-2">
                {question.question}
              </p>
              
              {question.options && question.options.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {question.options.length} options
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1 ml-4">
              {onView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleView}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

QuestionItem.displayName = 'QuestionItem';

/**
 * Virtualized question list component for handling large datasets efficiently
 * Uses react-window for optimal performance with thousands of questions
 */
export const VirtualizedQuestionList: React.FC<VirtualizedQuestionListProps> = memo(({
  questions,
  onView,
  onEdit,
  onDelete,
  height = 600,
  itemHeight = 120
}) => {
  // Memoize the data object to prevent unnecessary re-renders
  const itemData = useMemo(() => ({
    questions,
    onView,
    onEdit,
    onDelete
  }), [questions, onView, onEdit, onDelete]);

  // Handle empty state
  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>No questions found</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 text-sm text-muted-foreground">
        Showing {questions.length} questions
      </div>
      
      <List
        height={height}
        itemCount={questions.length}
        itemSize={itemHeight}
        itemData={itemData}
        className="scrollbar-enhanced theme-border-subtle"
        style={{
          border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius)',
          background: 'hsl(var(--card))',
        }}
      >
        {QuestionItem}
      </List>
    </div>
  );
});

VirtualizedQuestionList.displayName = 'VirtualizedQuestionList';

// Export a hook for managing virtualized list performance
export function useVirtualizedListOptimization<T>(
  items: T[],
  filterFn?: (item: T) => boolean,
  sortFn?: (a: T, b: T) => number
) {
  const processedItems = useMemo(() => {
    let result = items;
    
    if (filterFn) {
      result = result.filter(filterFn);
    }
    
    if (sortFn) {
      result = [...result].sort(sortFn);
    }
    
    return result;
  }, [items, filterFn, sortFn]);

  const listStats = useMemo(() => ({
    totalItems: items.length,
    filteredItems: processedItems.length,
    filterRatio: processedItems.length / items.length || 0
  }), [items.length, processedItems.length]);

  return {
    items: processedItems,
    stats: listStats
  };
}