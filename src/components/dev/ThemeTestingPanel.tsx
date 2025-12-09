import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { 
  Sun, 
  Moon, 
  Palette, 
  Check, 
  X, 
  AlertTriangle, 
  Info,
  Timer,
  BookOpen,
  Settings
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

/**
 * Development component for testing theme-aware styles
 * Only include in development builds
 */
export const ThemeTestingPanel: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [testValue, setTestValue] = useState('Test input value');
  const [isEnabled, setIsEnabled] = useState(true);
  const [progress, setProgress] = useState(65);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="theme-shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Palette className="h-4 w-4" />
            Theme Testing Panel
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="ml-auto h-6 w-6 p-0"
            >
              {theme === 'dark' ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
            </Button>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4 text-xs">
          {/* Color Tokens Test */}
          <div className="space-y-2">
            <h4 className="font-medium text-xs">Color Tokens</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-background text-foreground p-2 border border-border rounded">
                Background/Foreground
              </div>
              <div className="bg-card text-card-foreground p-2 border border-border rounded">
                Card
              </div>
              <div className="bg-primary text-primary-foreground p-2 rounded">
                Primary
              </div>
              <div className="bg-secondary text-secondary-foreground p-2 rounded">
                Secondary
              </div>
              <div className="bg-muted text-muted-foreground p-2 rounded">
                Muted
              </div>
              <div className="bg-accent text-accent-foreground p-2 rounded">
                Accent
              </div>
            </div>
          </div>

          <Separator />

          {/* Component Tests */}
          <div className="space-y-2">
            <h4 className="font-medium text-xs">Components</h4>
            
            {/* Buttons */}
            <div className="flex gap-1 flex-wrap">
              <Button size="sm" className="text-xs h-6">Primary</Button>
              <Button variant="secondary" size="sm" className="text-xs h-6">Secondary</Button>
              <Button variant="outline" size="sm" className="text-xs h-6">Outline</Button>
              <Button variant="ghost" size="sm" className="text-xs h-6">Ghost</Button>
              <Button variant="destructive" size="sm" className="text-xs h-6">Destructive</Button>
            </div>

            {/* Badges */}
            <div className="flex gap-1 flex-wrap">
              <Badge variant="default" className="text-xs">Default</Badge>
              <Badge variant="secondary" className="text-xs">Secondary</Badge>
              <Badge variant="outline" className="text-xs">Outline</Badge>
              <Badge variant="destructive" className="text-xs">Destructive</Badge>
            </div>

            {/* Form Elements */}
            <Input
              placeholder="Test input"
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              className="text-xs h-7"
            />
            
            <Textarea
              placeholder="Test textarea"
              rows={2}
              className="text-xs resize-none"
            />

            <div className="flex items-center space-x-2">
              <Switch
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
                className="scale-75"
              />
              <span className="text-xs text-muted-foreground">Toggle switch</span>
            </div>

            <Progress value={progress} className="h-2" />
          </div>

          <Separator />

          {/* Alert Tests */}
          <div className="space-y-2">
            <h4 className="font-medium text-xs">Alerts</h4>
            
            <Alert className="py-2">
              <Info className="h-3 w-3" />
              <AlertDescription className="text-xs">
                Info alert message
              </AlertDescription>
            </Alert>

            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-3 w-3" />
              <AlertDescription className="text-xs">
                Error alert message
              </AlertDescription>
            </Alert>
          </div>

          <Separator />

          {/* Exam-Specific Tests */}
          <div className="space-y-2">
            <h4 className="font-medium text-xs">Exam Components</h4>
            
            {/* Timer States */}
            <div className="flex gap-2 text-xs">
              <div className="timer-normal flex items-center gap-1">
                <Timer className="h-3 w-3" />
                <span>15:30</span>
              </div>
              <div className="timer-warning flex items-center gap-1">
                <Timer className="h-3 w-3" />
                <span>05:15</span>
              </div>
              <div className="timer-critical flex items-center gap-1">
                <Timer className="h-3 w-3" />
                <span>02:30</span>
              </div>
            </div>

            {/* Question Card States */}
            <div className="space-y-1">
              <div className="exam-question-card p-2 rounded text-xs">
                Default question card
              </div>
              <div className="exam-answer-selected p-2 rounded text-xs border">
                Selected answer
              </div>
              <div className="exam-answer-correct p-2 rounded text-xs border">
                Correct answer
              </div>
              <div className="exam-answer-incorrect p-2 rounded text-xs border">
                Incorrect answer
              </div>
            </div>

            {/* Highlighting Test */}
            <div className="p-2 bg-muted rounded text-xs">
              This text has <span className="exam-highlight">highlighted content</span> that should work in both themes.
            </div>
          </div>

          <Separator />

          {/* Enhanced Utilities */}
          <div className="space-y-2">
            <h4 className="font-medium text-xs">Enhanced Utilities</h4>
            
            <div className="theme-shadow p-2 rounded text-xs bg-card">
              Card with theme shadow
            </div>
            
            <div className="theme-border-strong border p-2 rounded text-xs">
              Strong border
            </div>
            
            <div className="theme-loading-bg h-4 rounded overflow-hidden relative">
              <div className="absolute inset-0 theme-loading-bg" />
            </div>
          </div>

          {/* Theme Info */}
          <div className="text-xs text-muted-foreground pt-2 border-t border-border">
            Current theme: <span className="font-mono">{theme}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Hook for development theme testing utilities
 */
export function useThemeValidation() {
  const validateThemeTokens = () => {
    const tokens = [
      '--background',
      '--foreground', 
      '--card',
      '--card-foreground',
      '--primary',
      '--primary-foreground',
      '--secondary',
      '--secondary-foreground',
      '--muted',
      '--muted-foreground',
      '--accent',
      '--accent-foreground',
      '--destructive',
      '--destructive-foreground',
      '--border',
      '--input',
      '--ring'
    ];

    const missing = tokens.filter(token => {
      const value = getComputedStyle(document.documentElement).getPropertyValue(token);
      return !value || value.trim() === '';
    });

    if (missing.length > 0) {
      console.warn('Missing theme tokens:', missing);
      return false;
    }

    console.log('✅ All theme tokens are defined');
    return true;
  };

  const validateContrastRatios = () => {
    // This would implement WCAG contrast ratio checking
    // For now, just log that validation should be performed
    console.log('🎨 Manual contrast validation needed - check both light and dark modes');
  };

  return {
    validateThemeTokens,
    validateContrastRatios
  };
}