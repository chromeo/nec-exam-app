import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/apiService';

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  category?: string;
  reference?: string;
}

export interface ProgressData {
  examId: string;
  currentQuestionIndex: number;
  answers: Record<string, string>;
  timeRemaining: number;
  eliminatedAnswers: Record<string, string[]>;
  flaggedQuestions: Record<string, boolean>;
  questionComments: Record<string, string>;
  questionHighlights: Record<string, HighlightData[]>;
}

export interface HighlightData {
  id: string;
  text: string;
  startOffset: number;
  endOffset: number;
  containerId: string; // 'question' or 'answer-A', 'answer-B', etc.
}

interface UseExamReturn {
  questions: Question[];
  currentQuestionIndex: number;
  selectedAnswer: string;
  answers: Record<string, string>;
  eliminatedAnswers: Record<string, string[]>;
  flaggedQuestions: Record<string, boolean>;
  questionComments: Record<string, string>;
  questionHighlights: Record<string, HighlightData[]>;
  answeredQuestions: Question[];
  isSubmitting: boolean;
  isLoadingQuestions: boolean;
  leftPaneWidth: number;
  rightPaneCollapsed: boolean;
  currentCategory: string;
  examId: string | null;
  setCurrentQuestionIndex: (index: number) => void;
  setSelectedAnswer: (answer: string) => void;
  setAnswers: (answers: Record<string, string>) => void;
  setEliminatedAnswers: (eliminated: Record<string, string[]>) => void;
  setIsSubmitting: (submitting: boolean) => void;
  setLeftPaneWidth: (width: number) => void;
  setRightPaneCollapsed: (collapsed: boolean) => void;
  setCurrentCategory: (category: string) => void;
  loadQuestions: (examId: string, accessToken: string) => Promise<void>;
  loadExamSession: (examSession: any, accessToken: string) => Promise<void>;
  submitAnswer: () => void;
  clearCurrentAnswer: () => void;
  setCurrentAnswer: (answer: string) => void;
  eliminateAnswer: (option: string) => void;
  resetEliminations: () => void;
  toggleQuestionFlag: (questionId?: string) => void;
  setQuestionComment: (comment: string, questionId?: string) => void;
  addHighlight: (highlightData: HighlightData) => void;
  removeQuestionHighlights: () => void;
  saveProgress: (examId: string, timeRemaining: number, accessToken: string) => Promise<void>;
  loadProgress: (examId: string, accessToken: string) => Promise<ProgressData | null>;
  submitExam: (examId: string, accessToken: string) => Promise<any>;
}

export const useExam = (): UseExamReturn => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [eliminatedAnswers, setEliminatedAnswers] = useState<Record<string, string[]>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [questionComments, setQuestionComments] = useState<Record<string, string>>({});
  const [questionHighlights, setQuestionHighlights] = useState<Record<string, HighlightData[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [leftPaneWidth, setLeftPaneWidth] = useState(80); // Changed from 50 to 80 for 20% right pane default
  const [rightPaneCollapsed, setRightPaneCollapsed] = useState(false);
  const [currentCategory, setCurrentCategory] = useState('All Categories');
  const [examId, setExamId] = useState<string | null>(null);

  const answeredQuestions = questions.filter(q => answers[q.id]);

  const loadQuestions = async (examId: string, accessToken: string) => {
    setIsLoadingQuestions(true);
    try {
      const result = await ApiService.getExamQuestions(examId, accessToken);
      
      if (result.success && result.data) {
        setQuestions(result.data);
        // Try to load existing progress
        const progress = await loadProgress(examId, accessToken);
        if (progress) {
          setCurrentQuestionIndex(progress.currentQuestionIndex);
          setAnswers(progress.answers);
          setEliminatedAnswers(progress.eliminatedAnswers || {});
          setFlaggedQuestions(progress.flaggedQuestions || {});
          setQuestionComments(progress.questionComments || {});
          setQuestionHighlights(progress.questionHighlights || {});
          // Select the current answer if it exists
          const currentQuestion = result.data[progress.currentQuestionIndex];
          if (currentQuestion && progress.answers[currentQuestion.id]) {
            setSelectedAnswer(progress.answers[currentQuestion.id]);
          }
        }
      } else {
        console.error('Failed to load questions:', result.error);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const loadExamSession = async (examSession: any, accessToken: string) => {
    setIsLoadingQuestions(true);
    try {
      if (examSession && examSession.questions) {
        // Questions are already in the correct format from the server
        // No need to transform since the server now handles the format conversion
        setQuestions(examSession.questions);
        setExamId(examSession.id);
        
        // Reset state for new exam
        setCurrentQuestionIndex(0);
        setAnswers({});
        setEliminatedAnswers({});
        setFlaggedQuestions({});
        setQuestionComments({});
        setQuestionHighlights({});
        setSelectedAnswer('');
        setCurrentCategory('All Categories');
      } else {
        console.error('Invalid exam session data:', examSession);
      }
    } catch (error) {
      console.error('Error loading exam session:', error);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const submitAnswer = useCallback(() => {
    if (!selectedAnswer || !questions[currentQuestionIndex]) return;

    const currentQuestion = questions[currentQuestionIndex];
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: selectedAnswer
    }));
    setSelectedAnswer('');
    
    // Auto-advance to next question if not on the last question
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }, [selectedAnswer, questions, currentQuestionIndex]);

  const clearCurrentAnswer = useCallback(() => {
    if (!questions[currentQuestionIndex]) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    setAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[currentQuestion.id];
      return newAnswers;
    });
    setSelectedAnswer('');
  }, [questions, currentQuestionIndex]);

  const setCurrentAnswer = useCallback((answer: string) => {
    if (!questions[currentQuestionIndex]) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
    setSelectedAnswer(answer);
  }, [questions, currentQuestionIndex]);

  const eliminateAnswer = useCallback((option: string) => {
    if (!questions[currentQuestionIndex]) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    setEliminatedAnswers(prev => {
      const questionEliminated = prev[currentQuestion.id] || [];
      if (questionEliminated.includes(option)) {
        return {
          ...prev,
          [currentQuestion.id]: questionEliminated.filter(o => o !== option)
        };
      } else {
        return {
          ...prev,
          [currentQuestion.id]: [...questionEliminated, option]
        };
      }
    });
  }, [questions, currentQuestionIndex]);

  const resetEliminations = useCallback(() => {
    if (!questions[currentQuestionIndex]) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    setEliminatedAnswers(prev => {
      const newEliminated = { ...prev };
      delete newEliminated[currentQuestion.id];
      return newEliminated;
    });
  }, [questions, currentQuestionIndex]);

  const toggleQuestionFlag = useCallback((questionId?: string) => {
    if (!questions[currentQuestionIndex]) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    setFlaggedQuestions(prev => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id]
    }));
  }, [questions, currentQuestionIndex]);

  const setQuestionComment = useCallback((comment: string, questionId?: string) => {
    if (!questions[currentQuestionIndex]) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    setQuestionComments(prev => ({
      ...prev,
      [currentQuestion.id]: comment
    }));
  }, [questions, currentQuestionIndex]);

  const addHighlight = useCallback((highlightData: HighlightData) => {
    if (!questions[currentQuestionIndex]) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    setQuestionHighlights(prev => ({
      ...prev,
      [currentQuestion.id]: [...prev[currentQuestion.id] || [], highlightData]
    }));
  }, [questions, currentQuestionIndex]);

  const removeQuestionHighlights = useCallback(() => {
    if (!questions[currentQuestionIndex]) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    setQuestionHighlights(prev => {
      const newHighlights = { ...prev };
      delete newHighlights[currentQuestion.id];
      return newHighlights;
    });
  }, [questions, currentQuestionIndex]);

  const saveProgress = async (examId: string, timeRemaining: number, accessToken: string) => {
    try {
      const progressData: ProgressData = {
        examId,
        currentQuestionIndex,
        answers,
        timeRemaining,
        eliminatedAnswers,
        flaggedQuestions,
        questionComments,
        questionHighlights
      };
      
      await ApiService.saveExamProgress(progressData, accessToken);
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const loadProgress = async (examId: string, accessToken: string): Promise<ProgressData | null> => {
    try {
      const result = await ApiService.loadExamProgress(examId, accessToken);
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Error loading progress:', error);
      return null;
    }
  };

  const submitExam = async (examId: string, accessToken: string) => {
    try {
      const submissionData = {
        examId,
        answers,
        questions: questions.map(q => ({
          id: q.id,
          question: q.question,
          correctAnswer: q.correctAnswer
        }))
      };
      
      const result = await ApiService.submitExam(submissionData, accessToken);
      
      return result;
    } catch (error) {
      console.error('Error submitting exam:', error);
      throw error;
    }
  };

  // Update selected answer when current question changes
  useEffect(() => {
    if (questions[currentQuestionIndex]) {
      const currentQuestion = questions[currentQuestionIndex];
      setSelectedAnswer(answers[currentQuestion.id] || '');
    }
  }, [currentQuestionIndex, questions, answers]);

  return {
    questions,
    currentQuestionIndex,
    selectedAnswer,
    answers,
    eliminatedAnswers,
    flaggedQuestions,
    questionComments,
    questionHighlights,
    answeredQuestions,
    isSubmitting,
    isLoadingQuestions,
    leftPaneWidth,
    rightPaneCollapsed,
    currentCategory,
    examId,
    setCurrentQuestionIndex,
    setSelectedAnswer,
    setAnswers,
    setEliminatedAnswers,
    setIsSubmitting,
    setLeftPaneWidth,
    setRightPaneCollapsed,
    setCurrentCategory,
    loadQuestions,
    loadExamSession,
    submitAnswer,
    clearCurrentAnswer,
    setCurrentAnswer,
    eliminateAnswer,
    resetEliminations,
    toggleQuestionFlag,
    setQuestionComment,
    addHighlight,
    removeQuestionHighlights,
    saveProgress,
    loadProgress,
    submitExam,
  };
};