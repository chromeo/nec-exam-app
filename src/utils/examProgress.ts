interface Question {
  id: string;
  question: string;
  options: string[];
  category: string;
  reference?: string;
  createdAt: string;
}

interface ExamConfig {
  questionCount: number;
  timeLimit: number;
  categories: string[];
  title?: string;
  description?: string;
  moreDetails?: string;
}

export interface SavedExamProgress {
  examId: string;
  examTitle: string;
  studentId: string;
  questions: Question[];
  config: ExamConfig;
  currentQuestionIndex: number;
  answers: { [key: string]: { answer: number; flagged: boolean } };
  comments: { [key: string]: string };
  flags: { [key: string]: boolean };
  bookmarks: { [key: string]: boolean };
  eliminatedAnswers: { [key: string]: Set<number> };
  timeRemaining: number;
  savedAt: string;
  startedAt: string;
}

const STORAGE_KEY = 'exam-progress';
const MAX_SAVED_EXAMS = 5; // Limit stored exams to prevent localStorage bloat

export function saveExamProgress(progress: SavedExamProgress): void {
  try {
    const existingProgress = getStoredProgress();
    
    // Convert Set objects to arrays for JSON serialization
    const serializedProgress = {
      ...progress,
      eliminatedAnswers: Object.fromEntries(
        Object.entries(progress.eliminatedAnswers).map(([key, set]) => [key, Array.from(set)])
      ),
      savedAt: new Date().toISOString(),
    };
    
    // Update or add this exam's progress
    const updatedProgress = {
      ...existingProgress,
      [progress.examId]: serializedProgress,
    };
    
    // Keep only the most recent exams
    const sortedEntries = Object.entries(updatedProgress).sort(
      ([, a], [, b]) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
    
    const limitedProgress = Object.fromEntries(sortedEntries.slice(0, MAX_SAVED_EXAMS));
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedProgress));
  } catch (error) {
    console.error('Failed to save exam progress:', error);
  }
}

export function loadExamProgress(examId: string): SavedExamProgress | null {
  try {
    const stored = getStoredProgress();
    const progress = stored[examId];
    
    if (!progress) return null;
    
    // Convert arrays back to Set objects
    const deserializedProgress: SavedExamProgress = {
      ...progress,
      eliminatedAnswers: Object.fromEntries(
        Object.entries(progress.eliminatedAnswers || {}).map(([key, arr]) => [key, new Set(arr as number[])])
      ),
    };
    
    return deserializedProgress;
  } catch (error) {
    console.error('Failed to load exam progress:', error);
    return null;
  }
}

export function deleteExamProgress(examId: string): void {
  try {
    const existingProgress = getStoredProgress();
    delete existingProgress[examId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingProgress));
  } catch (error) {
    console.error('Failed to delete exam progress:', error);
  }
}

export function getAllSavedExams(): SavedExamProgress[] {
  try {
    const stored = getStoredProgress();
    return Object.values(stored).sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
  } catch (error) {
    console.error('Failed to get saved exams:', error);
    return [];
  }
}

export function hasResumeableExam(examId: string): boolean {
  const progress = loadExamProgress(examId);
  return progress !== null;
}

function getStoredProgress(): { [examId: string]: any } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to parse stored progress:', error);
    return {};
  }
}

export function clearOldProgress(): void {
  try {
    const stored = getStoredProgress();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentProgress = Object.fromEntries(
      Object.entries(stored).filter(([, progress]: [string, any]) => {
        const savedAt = new Date(progress.savedAt);
        return savedAt > sevenDaysAgo;
      })
    );
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentProgress));
  } catch (error) {
    console.error('Failed to clear old progress:', error);
  }
}

// Auto-cleanup old progress on page load
if (typeof window !== 'undefined') {
  clearOldProgress();
}