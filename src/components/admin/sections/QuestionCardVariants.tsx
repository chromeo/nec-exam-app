import React from 'react';
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Card, CardContent } from "../../ui/card";
import { Checkbox } from "../../ui/checkbox";
import { Edit, Trash2 } from "lucide-react";
import type { Question } from "../../../supabase/functions/server/types";

interface QuestionCardProps {
  question: Question;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  formatDate: (date: string) => string;
}

// Original Compact Design
export const CompactQuestionCard: React.FC<QuestionCardProps> = ({
  question,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  formatDate
}) => (
  <Card className="hover:shadow-md transition-shadow border-l-4 border-l-transparent hover:border-l-blue-500">
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <Checkbox checked={isSelected} onCheckedChange={onSelect} className="mt-1" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="font-medium text-base leading-tight line-clamp-2 pr-2">
              {question.question}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 w-7 p-0">
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-3">
            {question.options?.map((option, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-md border ${
                  question.correctAnswer === index 
                    ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
                    : 'bg-muted/30 border-transparent'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                  question.correctAnswer === index
                    ? 'bg-green-600 dark:bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span className={`line-clamp-1 flex-1 ${question.correctAnswer === index ? 'font-medium' : ''}`}>
                  {option}
                </span>
                {question.correctAnswer === index && (
                  <span className="text-green-600 dark:text-green-400">✓</span>
                )}
              </div>
            )) || (
              <div className="col-span-2 text-muted-foreground text-sm text-center py-2">
                No options available
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                {question.category}
              </Badge>
              {question.difficulty && (
                <Badge 
                  variant="outline" 
                  className={`text-[10px] px-1.5 py-0.5 ${
                    question.difficulty === 'Easy' ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300' :
                    question.difficulty === 'Medium' ? 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300' : 
                    'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
                  }`}
                >
                  {question.difficulty}
                </Badge>
              )}
              {question.status && (
                <Badge 
                  variant="outline" 
                  className={`text-[10px] px-1.5 py-0.5 ${
                    question.status === 'Final' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
                    'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
                  }`}
                >
                  {question.status}
                </Badge>
              )}
              {question.editions && question.editions.length > 0 && (
                <div className="flex items-center gap-1">
                  {question.editions.map((ed) => (
                    <Badge 
                      key={ed.code}
                      variant="outline" 
                      className="text-[9px] px-1 py-0 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono"
                      title={`Valid for ${ed.code}`}
                    >
                      {ed.code.replace('NEC-', '')}
                    </Badge>
                  ))}
                </div>
              )}
              {question.reference && (
                <span className="text-muted-foreground truncate flex-1">
                  Ref: {question.reference}
                </span>
              )}
            </div>
            <span className="text-muted-foreground whitespace-nowrap">
              {formatDate(question.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Ultra Dense Design for A/B Testing
export const DenseQuestionCard: React.FC<QuestionCardProps> = ({
  question,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  formatDate
}) => (
  <Card className="hover:shadow-sm transition-all duration-200 border-l-2 border-l-transparent hover:border-l-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-950/30">
    <CardContent className="p-3">
      <div className="flex items-start gap-2">
        <Checkbox checked={isSelected} onCheckedChange={onSelect} className="mt-0.5" />
        
        <div className="flex-1 min-w-0">
          {/* Header: Question + Actions */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-medium text-sm leading-tight line-clamp-2 flex-1">
              {question.question}
            </h3>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={onEdit} className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900">
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-red-100 dark:hover:bg-red-900"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {/* Options - Single Row Layout */}
          <div className="flex items-center gap-1 mb-2 overflow-x-auto pb-1">
            {question.options?.map((option, index) => (
              <div
                key={index}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded whitespace-nowrap flex-shrink-0 ${
                  question.correctAnswer === index 
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 ring-1 ring-green-300 dark:ring-green-700' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-medium ${
                  question.correctAnswer === index
                    ? 'bg-green-600 dark:bg-green-500 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                }`}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span className={`max-w-[100px] truncate ${question.correctAnswer === index ? 'font-medium' : ''}`}>
                  {option}
                </span>
                {question.correctAnswer === index && (
                  <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                )}
              </div>
            )) || (
              <div className="text-muted-foreground text-xs italic">No options</div>
            )}
          </div>
          
          {/* Footer - Single Row */}
          <div className="flex items-center justify-between gap-2 text-[10px]">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                {question.category}
              </Badge>
              {question.difficulty && (
                <Badge 
                  variant="outline" 
                  className={`text-[9px] px-1 py-0 border ${
                    question.difficulty === 'Easy' ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' :
                    question.difficulty === 'Medium' ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800' : 
                    'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                  }`}
                >
                  {question.difficulty}
                </Badge>
              )}
              {question.status && (
                <Badge 
                  variant="outline" 
                  className={`text-[9px] px-1 py-0 border ${
                    question.status === 'Final' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800' :
                    'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
                  }`}
                >
                  {question.status}
                </Badge>
              )}
              {question.editions && question.editions.length > 0 && (
                <div className="flex items-center gap-1">
                  {question.editions.map((ed) => (
                    <Badge 
                      key={ed.code}
                      variant="outline" 
                      className="text-[9px] px-1 py-0 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono"
                      title={`Valid for ${ed.code}`}
                    >
                      {ed.code.replace('NEC-', '')}
                    </Badge>
                  ))}
                </div>
              )}
              {question.reference && (
                <span className="text-muted-foreground truncate text-[9px]">
                  {question.reference}
                </span>
              )}
            </div>
            <span className="text-muted-foreground whitespace-nowrap text-[9px]">
              {formatDate(question.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Expanded Design for A/B Testing
export const ExpandedQuestionCard: React.FC<QuestionCardProps> = ({
  question,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  formatDate
}) => (
  <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-transparent hover:border-l-blue-500">
    <CardContent className="p-6">
      <div className="flex items-start gap-4">
        <Checkbox checked={isSelected} onCheckedChange={onSelect} className="mt-2" />
        
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="font-semibold text-lg leading-relaxed mb-2">
                {question.question}
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {question.category}
                </Badge>
                {question.difficulty && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-2 py-1 ${
                      question.difficulty === 'Easy' ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300' :
                      question.difficulty === 'Medium' ? 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300' : 
                      'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
                    }`}
                  >
                    {question.difficulty}
                  </Badge>
                )}
                {question.status && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-2 py-1 ${
                      question.status === 'Final' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
                      'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
                    }`}
                  >
                    {question.status}
                  </Badge>
                )}
                {question.editions && question.editions.length > 0 && (
                  <div className="flex items-center gap-1">
                    {question.editions.map((ed) => (
                      <Badge 
                        key={ed.code}
                        variant="outline" 
                        className="text-xs px-2 py-1 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono"
                        title={`Valid for ${ed.code}`}
                      >
                        {ed.code.replace('NEC-', '')}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={onEdit} className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="flex items-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
          
          {/* Options - Vertical Stack */}
          <div className="space-y-3 mb-4">
            {question.options?.map((option, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  question.correctAnswer === index 
                    ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 shadow-sm' 
                    : 'bg-muted/50 border-muted-foreground/20 hover:bg-muted/70'
                }`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  question.correctAnswer === index
                    ? 'bg-green-600 dark:bg-green-500 text-white'
                    : 'bg-primary text-primary-foreground'
                }`}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span className={`flex-1 ${question.correctAnswer === index ? 'font-semibold' : ''}`}>
                  {option}
                </span>
                {question.correctAnswer === index && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                    <span className="text-lg">✓</span>
                    <span className="text-sm">Correct Answer</span>
                  </div>
                )}
              </div>
            )) || (
              <div className="text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                No options available
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-muted-foreground/20">
            {question.reference && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Reference:</span> {question.reference}
              </div>
            )}
            <div className="text-sm text-muted-foreground ml-auto">
              Created {formatDate(question.createdAt)}
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);