import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Button } from './ui/button';
import { ChevronDown, Calculator, FileText, HelpCircle, X, Save, Pause, ClipboardCheck } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { ColorSchemeToggle } from './ColorSchemeToggle';

interface ExamHeaderProps {
  currentQuestion: number;
  totalQuestions: number;
  timeRemaining: string;
  onToggleAnswerEliminator: () => void;
  onSaveProgress?: () => void;
  examTitle?: string;
}

export function ExamHeader({ 
  currentQuestion, 
  totalQuestions, 
  timeRemaining, 
  onToggleAnswerEliminator, 
  onSaveProgress,
  examTitle 
}: ExamHeaderProps) {
  return (
    <div className="bg-background border-b border-border px-4 py-3 flex items-center justify-between">
      {/* Question Counter and Exam Title */}
      <div className="flex items-center space-x-4">
        <span className="bg-primary/10 text-primary px-3 py-1 rounded">
          {currentQuestion} of {totalQuestions}
        </span>
        {examTitle && (
          <span className="font-semibold text-foreground">
            {examTitle}
          </span>
        )}
      </div>

      {/* Tools Dropdown */}
      <div className="flex items-center space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center space-x-2">
              <span>Tools</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem 
              className="flex items-center space-x-2 cursor-pointer"
              onClick={onToggleAnswerEliminator}
            >
              <X className="h-4 w-4" />
              <span>Answer Eliminator</span>
            </DropdownMenuItem>
            {onSaveProgress && (
              <DropdownMenuItem 
                className="flex items-center space-x-2 cursor-pointer"
                onClick={onSaveProgress}
              >
                <Save className="h-4 w-4" />
                <span>Save Progress</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="flex items-center space-x-2">
              <Calculator className="h-4 w-4" />
              <span>Calculator</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Highlighter</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center space-x-2">
              <HelpCircle className="h-4 w-4" />
              <span>Line Shader</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <ThemeToggle />
        <ColorSchemeToggle />
      </div>

      {/* Countdown Timer */}
      <div className="flex items-center space-x-2">
        <span className="bg-destructive/10 text-destructive px-3 py-1 rounded font-mono">
          {timeRemaining} remaining
        </span>
      </div>
    </div>
  );
}