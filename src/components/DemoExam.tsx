import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { Checkbox } from "./ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { HighlighterComponent } from "./HighlighterComponent";
import { FeedbackButton } from "./FeedbackButton";
import { 
  ArrowLeft, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  BookOpen, 
  Trophy,
  Star,
  Home,
  UserPlus,
  Settings,
  EyeOff,
  Highlighter,
  Calculator,
  Check,
  X,
  Flag
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

// Demo highlight data interface
interface DemoHighlightData {
  id: string;
  text: string;
  startOffset: number;
  endOffset: number;
  containerId: string;
}

interface DemoExamProps {
  onFinishDemo: () => void;
  onSignUp: () => void;
}

interface DemoQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: string;
}

const demoQuestions: DemoQuestion[] = [
  {
    id: "demo-1",
    question: "According to NEC Article 110.14(C), what is the maximum temperature rating for conductors when terminating on equipment rated 100 amperes or less?",
    options: [
      "60°C (140°F)",
      "75°C (167°F)", 
      "90°C (194°F)",
      "105°C (221°F)"
    ],
    correctAnswer: 0,
    explanation: "NEC 110.14(C)(1)(a) states that unless the equipment is listed and marked otherwise, conductor ampacities shall be based on the 60°C column for equipment rated 100 amperes or less.",
    category: "NEC Basics"
  },
  {
    id: "demo-2", 
    question: "What is the minimum burial depth for direct burial UF cable in a residential application?",
    options: [
      "12 inches",
      "18 inches",
      "24 inches", 
      "30 inches"
    ],
    correctAnswer: 2,
    explanation: "According to NEC Table 300.5, UF cable in residential areas requires a minimum burial depth of 24 inches unless installed under a building or in conduit.",
    category: "Installation"
  },
  {
    id: "demo-3",
    question: "For a 20-ampere branch circuit, what is the maximum load permitted under NEC 210.23(A)?",
    options: [
      "16 amperes",
      "20 amperes",
      "24 amperes",
      "25 amperes"
    ],
    correctAnswer: 0,
    explanation: "NEC 210.23(A) limits the load on a 20-ampere branch circuit to 80% of the rating (16 amperes) for continuous loads, unless the assembly and overcurrent device are listed for 100% of their rating.",
    category: "Load Calculations"
  },
  {
    id: "demo-4",
    question: "What is the required GFCI protection for receptacles in a residential bathroom?",
    options: [
      "Only receptacles within 3 feet of the sink",
      "Only receptacles within 6 feet of the tub or shower", 
      "All receptacles in the bathroom",
      "No GFCI protection required"
    ],
    correctAnswer: 2,
    explanation: "NEC 210.8(A)(1) requires GFCI protection for all 125-volt, single-phase, 15- and 20-ampere receptacles installed in bathrooms of dwelling units.",
    category: "Safety"
  },
  {
    id: "demo-5",
    question: "What is the standard height for mounting receptacle outlets in a dwelling unit?",
    options: [
      "12 inches above the floor",
      "15 inches above the floor",
      "18 inches above the floor",
      "No specific height required by NEC"
    ],
    correctAnswer: 3,
    explanation: "The NEC does not specify a standard mounting height for general-use receptacles in dwelling units. However, local codes may have requirements, and ADA guidelines suggest 15-48 inches above the floor.",
    category: "Installation"
  }
];

export function DemoExam({ onFinishDemo, onSignUp }: DemoExamProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes for demo
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Demo tools state
  const [activeTools, setActiveTools] = useState<Set<string>>(new Set());
  const [eliminatedAnswers, setEliminatedAnswers] = useState<Record<string, string[]>>({});
  const [questionHighlights, setQuestionHighlights] = useState<Record<string, DemoHighlightData[]>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());

  const currentQuestion = demoQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / demoQuestions.length) * 100;
  const totalQuestions = demoQuestions.length;

  // Timer countdown
  useEffect(() => {
    if (showResults || isCompleted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsCompleted(true);
          setShowResults(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showResults, isCompleted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResults) return;
    
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestion.id]: answerIndex
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < demoQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleFinishExam = () => {
    setIsCompleted(true);
    setShowResults(true);
  };

  const handleToolSelect = (tool: string) => {
    const newActiveTools = new Set(activeTools);
    const wasEmpty = activeTools.size === 0;
    
    if (newActiveTools.has(tool)) {
      newActiveTools.delete(tool);
    } else {
      newActiveTools.add(tool);
      
      // Show first-time tool activation message
      if (wasEmpty) {
        // This would be a toast in the real app, but for demo we'll just use the visual indicators
      }
    }
    setActiveTools(newActiveTools);
  };

  const handleAnswerEliminate = (questionId: string, option: string) => {
    const eliminated = eliminatedAnswers[questionId] || [];
    const newEliminated = eliminated.includes(option)
      ? eliminated.filter(opt => opt !== option)
      : [...eliminated, option];
    
    setEliminatedAnswers({
      ...eliminatedAnswers,
      [questionId]: newEliminated
    });
  };

  const handleQuestionFlag = (questionId: string) => {
    const newFlagged = new Set(flaggedQuestions);
    if (newFlagged.has(questionId)) {
      newFlagged.delete(questionId);
    } else {
      newFlagged.add(questionId);
    }
    setFlaggedQuestions(newFlagged);
  };

  const handleAddHighlight = (highlight: DemoHighlightData) => {
    const questionId = currentQuestion.id;
    const existingHighlights = questionHighlights[questionId] || [];
    
    setQuestionHighlights({
      ...questionHighlights,
      [questionId]: [...existingHighlights, highlight]
    });
  };

  const calculateResults = () => {
    let correct = 0;
    demoQuestions.forEach((question) => {
      if (selectedAnswers[question.id] === question.correctAnswer) {
        correct++;
      }
    });
    return {
      correct,
      total: demoQuestions.length,
      percentage: Math.round((correct / demoQuestions.length) * 100)
    };
  };

  const results = calculateResults();

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600 dark:text-green-400";
    if (percentage >= 70) return "text-blue-600 dark:text-blue-400";
    if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBadgeVariant = (percentage: number) => {
    if (percentage >= 80) return "default";
    if (percentage >= 70) return "secondary";
    return "destructive";
  };

  // Results view
  if (showResults) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-medium text-foreground">Demo Complete!</span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Results Summary */}
          <Card className="mb-8 border-border">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Demo Exam Results</CardTitle>
              <CardDescription>
                Here's how you performed on our 5-question NEC sample exam
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <div className={`text-4xl font-medium mb-2 ${getScoreColor(results.percentage)}`}>
                  {results.percentage}%
                </div>
                <div className="text-muted-foreground mb-4">
                  {results.correct} out of {results.total} questions correct
                </div>
                <Badge variant={getScoreBadgeVariant(results.percentage)} className="text-sm">
                  {results.percentage >= 80 ? "Excellent!" : 
                   results.percentage >= 70 ? "Good Job!" : 
                   results.percentage >= 60 ? "Keep Studying!" : "Need More Practice"}
                </Badge>
              </div>
              
              <Progress value={results.percentage} className="h-3 mb-6" />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-medium text-green-600 dark:text-green-400 mb-2">
                    {results.correct}
                  </div>
                  <div className="text-sm text-muted-foreground">Correct</div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-medium text-red-600 dark:text-red-400 mb-2">
                    {results.total - results.correct}
                  </div>
                  <div className="text-sm text-muted-foreground">Incorrect</div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-medium text-blue-600 dark:text-blue-400 mb-2">
                    {formatTime(300 - timeRemaining)}
                  </div>
                  <div className="text-sm text-muted-foreground">Time Used</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Question Review */}
          <Card className="mb-8 border-border">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-primary" />
                Question Review
              </CardTitle>
              <CardDescription>
                Review each question with detailed explanations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {demoQuestions.map((question, index) => {
                const userAnswer = selectedAnswers[question.id];
                const isCorrect = userAnswer === question.correctAnswer;
                
                return (
                  <div key={question.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">Question {index + 1}</Badge>
                        <Badge variant="secondary">{question.category}</Badge>
                      </div>
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    
                    <p className="text-foreground mb-4 leading-relaxed">{question.question}</p>
                    
                    <div className="space-y-2 mb-4">
                      {question.options.map((option, optionIndex) => {
                        const isUserAnswer = userAnswer === optionIndex;
                        const isCorrectAnswer = optionIndex === question.correctAnswer;
                        
                        let className = "p-3 rounded-lg border ";
                        if (isCorrectAnswer) {
                          className += "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200";
                        } else if (isUserAnswer && !isCorrect) {
                          className += "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200";
                        } else {
                          className += "bg-muted/30 border-border text-muted-foreground";
                        }
                        
                        return (
                          <div key={optionIndex} className={className}>
                            <div className="flex items-center justify-start space-x-3 w-full">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-current flex-shrink-0">
                                <span className="text-xs font-medium">
                                  {String.fromCharCode(65 + optionIndex)}
                                </span>
                              </div>
                              <span className="text-sm flex-1 text-left leading-relaxed">{option}</span>
                              <div className="flex-shrink-0">
                                {isCorrectAnswer && <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />}
                                {isUserAnswer && !isCorrect && <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Explanation:</strong> {question.explanation}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Call to Action */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-medium text-foreground mb-2">
                  Ready for the Full Experience?
                </h3>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  This was just a taste! Our full platform includes over 5,000 questions, 
                  adaptive learning, progress tracking, and much more to help you pass your 
                  certification exam with confidence.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button 
                    size="lg" 
                    onClick={onSignUp}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-8"
                  >
                    <UserPlus className="w-5 h-5 mr-2" />
                    Create Free Account
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    onClick={onFinishDemo}
                    className="px-8"
                  >
                    <Home className="w-5 h-5 mr-2" />
                    Back to Home
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Free 7-day trial • No credit card required • Cancel anytime
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Exam interface
  return (
    <div className="min-h-screen bg-background">
      {/* Feedback Button */}
      <FeedbackButton />
      
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onFinishDemo}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Exit Demo</span>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">DEMO</Badge>
                <span className="text-foreground font-medium">NEC Practice Exam</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className={timeRemaining < 60 ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question Panel */}
          <div className="lg:col-span-2">
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CardTitle className="text-lg">Question {currentQuestionIndex + 1}</CardTitle>
                    <Badge variant="outline">{currentQuestion.category}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Tools Dropdown */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="relative">
                                  <Settings className="w-4 h-4 mr-2" />
                                  Tools
                                  {activeTools.size > 0 && (
                                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
                                      {activeTools.size}
                                    </div>
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem 
                                  onClick={() => handleToolSelect('Answer Eliminator')}
                                  className={`text-sm py-3 cursor-pointer ${activeTools.has('Answer Eliminator') ? 'bg-accent' : ''}`}
                                >
                                  <EyeOff className="w-4 h-4 mr-3" />
                                  Answer Eliminator
                                  {activeTools.has('Answer Eliminator') && (
                                    <Check className="w-4 h-4 ml-auto text-green-600 dark:text-green-400" />
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleToolSelect('Highlighter')}
                                  className={`text-sm py-3 cursor-pointer ${activeTools.has('Highlighter') ? 'bg-accent' : ''}`}
                                >
                                  <Highlighter className="w-4 h-4 mr-3" />
                                  Highlighter
                                  {activeTools.has('Highlighter') && (
                                    <Check className="w-4 h-4 ml-auto text-green-600 dark:text-green-400" />
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleToolSelect('Calculator')}
                                  className={`text-sm py-3 cursor-pointer ${activeTools.has('Calculator') ? 'bg-accent' : ''}`}
                                >
                                  <Calculator className="w-4 h-4 mr-3" />
                                  Calculator
                                  {activeTools.has('Calculator') && (
                                    <Check className="w-4 h-4 ml-auto text-green-600 dark:text-green-400" />
                                  )}
                                </DropdownMenuItem>
                                {activeTools.size > 0 && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => setActiveTools(new Set())}
                                      className="text-sm py-3 cursor-pointer"
                                    >
                                      <X className="w-4 h-4 mr-3" />
                                      Clear Tools
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Access powerful exam tools like Answer Eliminator and Highlighter</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* Question Flag */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant={flaggedQuestions.has(currentQuestion.id) ? "default" : "ghost"} 
                            size="sm"
                            onClick={() => handleQuestionFlag(currentQuestion.id)}
                          >
                            <Flag className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{flaggedQuestions.has(currentQuestion.id) ? 'Unflag' : 'Flag'} for review</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <HighlighterComponent
                    containerId="question"
                    isHighlighterActive={activeTools.has('Highlighter')}
                    highlights={questionHighlights[currentQuestion.id] || []}
                    onAddHighlight={handleAddHighlight}
                    className={`transition-all duration-200 ${
                      activeTools.has('Highlighter') ? 'bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800' : ''
                    }`}
                  >
                    <p className="text-foreground leading-relaxed">
                      {currentQuestion.question}
                    </p>
                  </HighlighterComponent>
                  {activeTools.has('Highlighter') && (
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-2 flex items-center gap-1">
                      <Highlighter className="w-3 h-3" />
                      Highlighter active - select text to highlight key information
                    </p>
                  )}
                </div>
                
                <div className="space-y-3 relative">
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswers[currentQuestion.id] === index;
                    const optionLetter = String.fromCharCode(65 + index);
                    const isEliminated = eliminatedAnswers[currentQuestion.id]?.includes(optionLetter) || false;
                    const isHighlighterActive = activeTools.has('Highlighter');
                    
                    return (
                      <div key={index} className="relative group">
                        <HighlighterComponent
                          containerId={`answer-${optionLetter}`}
                          isHighlighterActive={activeTools.has('Highlighter')}
                          highlights={questionHighlights[currentQuestion.id] || []}
                          onAddHighlight={handleAddHighlight}
                          className="w-full"
                        >
                          <button
                            onClick={() => !isEliminated && handleAnswerSelect(index)}
                            disabled={isEliminated}
                            className={`w-full p-4 text-left rounded-lg border transition-all duration-200 ${
                              isEliminated 
                                ? "bg-muted/30 border-border text-muted-foreground opacity-50 cursor-not-allowed" 
                                : isSelected
                                ? "bg-primary/10 border-primary text-foreground shadow-lg"
                                : "bg-card border-border hover:bg-muted/50 text-card-foreground hover:shadow-md"
                            } ${isHighlighterActive ? 'cursor-text' : ''}`}
                            style={{ 
                              width: activeTools.has('Answer Eliminator') ? '85%' : '100%'
                            }}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                                isEliminated
                                  ? "border-muted-foreground bg-muted"
                                  : isSelected 
                                  ? "border-primary bg-primary" 
                                  : "border-muted-foreground bg-background"
                              }`}>
                                {isSelected && !isEliminated && (
                                  <div className="w-3 h-3 bg-primary-foreground rounded-full"></div>
                                )}
                                {isEliminated && (
                                  <X className="w-3 h-3 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className={`font-medium text-sm ${isEliminated ? 'line-through' : ''}`}>
                                    {optionLetter}.
                                  </span>
                                  <span className={`text-sm leading-relaxed ${
                                    isEliminated ? 'line-through text-muted-foreground' : ''
                                  }`}>
                                    {option}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        </HighlighterComponent>
                        
                        {/* Answer Eliminator Checkbox */}
                        {activeTools.has('Answer Eliminator') && (
                          <div 
                            className="absolute top-4 right-0 flex items-center justify-center w-10 h-10 bg-card border border-border rounded-lg shadow-sm translate-x-12"
                          >
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Checkbox
                                      checked={isEliminated}
                                      onCheckedChange={() => handleAnswerEliminate(currentQuestion.id, optionLetter)}
                                      className="w-5 h-5 border-2 border-muted-foreground data-[state=checked]:bg-red-600 dark:data-[state=checked]:bg-red-500 data-[state=checked]:border-red-600 dark:data-[state=checked]:border-red-500 data-[state=checked]:text-white"
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{isEliminated ? 'Restore' : 'Eliminate'} answer option {optionLetter}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Active Tools Indicator */}
                  {activeTools.size > 0 && (
                    <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <Settings className="w-4 h-4" />
                        <span className="font-medium">Active Tools:</span>
                        <div className="flex gap-2">
                          {Array.from(activeTools).map(tool => (
                            <Badge key={tool} variant="secondary" className="text-xs">
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {activeTools.has('Highlighter') && (
                        <p className="text-xs text-muted-foreground mt-2">
                          💡 Select text in the question or answers to highlight important information
                          {questionHighlights[currentQuestion.id]?.length > 0 && (
                            <span className="ml-2 text-primary font-medium">
                              ({questionHighlights[currentQuestion.id].length} highlight{questionHighlights[currentQuestion.id].length !== 1 ? 's' : ''})
                            </span>
                          )}
                        </p>
                      )}
                      {activeTools.has('Answer Eliminator') && (
                        <p className="text-xs text-muted-foreground mt-2">
                          ❌ Use checkboxes to eliminate incorrect answers and narrow your choices
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  
                  {currentQuestionIndex === totalQuestions - 1 ? (
                    <Button
                      onClick={handleFinishExam}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      disabled={Object.keys(selectedAnswers).length < totalQuestions}
                    >
                      Finish Demo
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      disabled={selectedAnswers[currentQuestion.id] === undefined}
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">Question Overview</CardTitle>
                <CardDescription>
                  Track your progress through the demo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {demoQuestions.map((_, index) => {
                    const questionId = demoQuestions[index].id;
                    const isAnswered = selectedAnswers[questionId] !== undefined;
                    const isCurrent = index === currentQuestionIndex;
                    const isFlagged = flaggedQuestions.has(questionId);
                    const hasEliminations = eliminatedAnswers[questionId]?.length > 0;
                    
                    return (
                      <button
                        key={index}
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`relative w-10 h-10 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${
                          isCurrent
                            ? "bg-primary text-primary-foreground"
                            : isAnswered
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {index + 1}
                        {isFlagged && (
                          <Flag className="absolute -top-1 -right-1 w-3 h-3 text-orange-500 fill-orange-500" />
                        )}
                        {hasEliminations && (
                          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Answered:</span>
                    <span className="font-medium">
                      {Object.keys(selectedAnswers).length} / {totalQuestions}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Time Left:</span>
                    <span className={`font-medium ${timeRemaining < 60 ? "text-red-600 dark:text-red-400" : ""}`}>
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                </div>

                <Separator className="my-4" />
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Flagged:</span>
                    <span className="font-medium flex items-center gap-1">
                      <Flag className="w-3 h-3 text-orange-500" />
                      {flaggedQuestions.size}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Eliminated:</span>
                    <span className="font-medium flex items-center gap-1">
                      <EyeOff className="w-3 h-3 text-red-500" />
                      {Object.values(eliminatedAnswers).flat().length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Highlights:</span>
                    <span className="font-medium flex items-center gap-1">
                      <Highlighter className="w-3 h-3 text-amber-500" />
                      {Object.values(questionHighlights).flat().length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tools Active:</span>
                    <span className="font-medium flex items-center gap-1">
                      <Settings className="w-3 h-3 text-primary" />
                      {activeTools.size}
                    </span>
                  </div>
                </div>

                <Separator className="my-4" />
                
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-3">
                    Experience powerful exam tools! Our full platform has over 5,000+ questions with advanced features.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onSignUp}
                    className="w-full"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Get Full Access
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}