import { useState, useCallback } from 'react';
import { ExamTemplate, ExamSession } from '../components/exam/ExamManager';
import { SavedExamProgress } from '../utils/examProgress';
import { projectId } from '../utils/supabase/info';

interface UseUnifiedExamResult {
  examSession: ExamSession | null;
  isLoading: boolean;
  error: string | null;
  startExam: (template: ExamTemplate | null, isDemo?: boolean, savedProgress?: SavedExamProgress) => Promise<{ success: boolean; session?: ExamSession; error?: string }>;
  submitExam: (
    currentAnswers?: Record<string, string>,
    questionComments?: Record<string, string>,
    flaggedQuestions?: Record<string, boolean>
  ) => Promise<{ success: boolean; data?: any; error?: string }>;
  exitExam: () => void;
}

export const useUnifiedExam = (
  accessToken: string,
  userProfile: any
): UseUnifiedExamResult => {
  const [examSession, setExamSession] = useState<ExamSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startExam = useCallback(async (
    template: ExamTemplate | null,
    isDemo = false,
    savedProgress?: SavedExamProgress
  ): Promise<{ success: boolean; session?: ExamSession; error?: string }> => {
    console.log('🎬 [useUnifiedExam.ts:27] startExam function called:', {
      hasTemplate: !!template,
      templateTitle: template?.title,
      templateId: template?.id,
      isDemo,
      hasSavedProgress: !!savedProgress,
      hasAccessToken: !!accessToken,
      hasUserProfile: !!userProfile
    });
    
    setIsLoading(true);
    setError(null);
    
    try {
      const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165`;
      console.log('🌐 [useUnifiedExam.ts:41] Server URL constructed:', {
        projectId,
        serverUrl,
        hasProjectId: !!projectId,
        projectIdLength: projectId?.length || 0
      });
      
      // If resuming from saved progress, create session directly
      if (savedProgress) {
        console.log('🔄 useUnifiedExam: Resuming exam from saved progress:', {
          title: savedProgress.examTitle,
          answers: Object.keys(savedProgress.answers).length,
          flags: Object.keys(savedProgress.flags).length,
          comments: Object.keys(savedProgress.comments).length,
          currentIndex: savedProgress.currentQuestionIndex,
          timeRemaining: savedProgress.timeRemaining
        });
        
        const resumedSession: ExamSession = {
          id: savedProgress.examId,
          user_id: savedProgress.studentId,
          template_id: 'resumed',
          title: savedProgress.examTitle,
          questions: savedProgress.questions,
          answers: Object.fromEntries(
            Object.entries(savedProgress.answers).map(([key, value]) => [
              key, 
              typeof value === 'object' ? value.answer : parseInt(value) || 0
            ])
          ),
          started_at: savedProgress.startedAt,
          time_limit: savedProgress.timeRemaining,
          timeLimit: savedProgress.timeRemaining,
          status: 'in_progress' as const,
          // Resume-specific fields
          studentId: savedProgress.studentId,
          currentQuestionIndex: savedProgress.currentQuestionIndex,
          comments: savedProgress.comments,
          flags: savedProgress.flags,
          bookmarks: savedProgress.bookmarks,
          eliminatedAnswers: Object.fromEntries(
            Object.entries(savedProgress.eliminatedAnswers).map(([key, value]) => [
              key,
              value instanceof Set ? value : new Set(value)
            ])
          ),
        };
        
        console.log('✅ useUnifiedExam: Created resumed session with flags and comments:', {
          flags: resumedSession.flags,
          comments: resumedSession.comments,
          currentQuestionIndex: resumedSession.currentQuestionIndex
        });
        
        setExamSession(resumedSession);
        setIsLoading(false);
        
        return { success: true, session: resumedSession };
      }
      
      // Original logic for starting new exam
      if (!template) {
        throw new Error('Template is required for starting new exam');
      }
      
      console.log('🚀 [useUnifiedExam.ts:96] Starting new exam with template:', {
        title: template.title,
        id: template.id,
        question_count: template.question_count,
        time_limit: template.time_limit,
        template_name: template.template_name
      });
      
      // Use the proper exam start endpoint that handles everything
      const requestUrl = `${serverUrl}/exam/start?templateId=${encodeURIComponent(template.id)}`;
      console.log('📋 [useUnifiedExam.ts:100] Constructing API request:', {
        serverUrl,
        fullUrl: requestUrl,
        templateId: template.id,
        encodedTemplateId: encodeURIComponent(template.id),
        hasAccessToken: !!accessToken,
        accessTokenLength: accessToken?.length || 0
      });
      
      console.log('🌐 [useUnifiedExam.ts:107] Making fetch request to:', requestUrl);
      const examStartResponse = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });
      
      console.log('📡 [useUnifiedExam.ts:115] Fetch response received:', {
        status: examStartResponse.status,
        statusText: examStartResponse.statusText,
        ok: examStartResponse.ok,
        headers: Object.fromEntries(examStartResponse.headers.entries())
      });
      
      if (!examStartResponse.ok) {
        console.error('❌ [useUnifiedExam.ts:123] Response NOT OK:', {
          status: examStartResponse.status,
          statusText: examStartResponse.statusText,
          url: requestUrl
        });
        throw new Error(`Failed to start exam: ${examStartResponse.status}`);
      }
      
      console.log('📦 [useUnifiedExam.ts:131] Parsing JSON response...');
      const examStartData = await examStartResponse.json();
      
      console.log('✅ [useUnifiedExam.ts:134] JSON parsed successfully:', {
        success: examStartData.success,
        hasData: !!examStartData.data,
        error: examStartData.error,
        dataKeys: examStartData.data ? Object.keys(examStartData.data) : []
      });
      
      if (!examStartData.success) {
        console.error('❌ [useUnifiedExam.ts:142] Server returned success=false:', {
          error: examStartData.error,
          fullResponse: examStartData
        });
        throw new Error(examStartData.error || 'Failed to start exam');
      }
      
      console.log('✅ [useUnifiedExam.ts:149] Exam session created successfully:', {
        sessionId: examStartData.data.sessionId,
        questionCount: examStartData.data.questions?.length || 0,
        timeLimit: examStartData.data.timeLimit,
        startTime: examStartData.data.startTime
      });
      
      // Create exam session from server response
      const session: ExamSession = {
        id: examStartData.data.sessionId,
        user_id: userProfile.id,
        template_id: template.id,
        title: template.title,
        questions: examStartData.data.questions.map((q: any) => ({
          ...q,
          userAnswer: null,
          // Transform to expected format
          option_a: q.options?.[0] || q.option_a || '',
          option_b: q.options?.[1] || q.option_b || '',
          option_c: q.options?.[2] || q.option_c || '',
          option_d: q.options?.[3] || q.option_d || '',
          // SECURITY: Do NOT include correct_answer in frontend during exam taking
          // The correct answers will be calculated server-side on submission
        })),
        answers: {},
        started_at: examStartData.data.startTime,
        time_limit: examStartData.data.timeLimit, // Server returns in minutes
        timeLimit: examStartData.data.timeLimit * 60, // Convert from minutes to seconds for timer
        status: 'in_progress' as const
      };
      
      console.log('🎓 [useUnifiedExam.ts:178] Final exam session object created:', {
        id: session.id,
        title: session.title,
        questionCount: session.questions.length,
        timeLimit: session.timeLimit,
        timeLimitMinutes: session.time_limit,
        status: session.status
      });
      
      setExamSession(session);
      console.log('💾 [useUnifiedExam.ts:187] Exam session saved to state');
      
      return { success: true, session };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : 'No stack trace';
      console.error('❌ 💥 [useUnifiedExam.ts:194] CATCH BLOCK - Error starting exam:', {
        message: errorMessage,
        error: error,
        stack: errorStack,
        errorType: error?.constructor?.name
      });
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      console.log('🏁 [useUnifiedExam.ts:203] Finally block - setting isLoading to false');
      setIsLoading(false);
    }
  }, [accessToken, userProfile]);

  const submitExam = useCallback(async (
    currentAnswers?: Record<string, string>,
    questionComments?: Record<string, string>,
    flaggedQuestions?: Record<string, boolean>
  ): Promise<{ success: boolean; data?: any; error?: string }> => {
    if (!examSession) {
      return { success: false, error: 'No active exam session' };
    }

    try {
      console.log('📝 useUnifiedExam: 🚀 Submitting exam to server:', examSession.id);
      
      // Use the provided currentAnswers or fall back to examSession.answers
      const finalAnswers = currentAnswers || examSession.answers;
      console.log('📝 useUnifiedExam: Final answers for server submission:', finalAnswers);
      console.log('📝 useUnifiedExam: Question comments:', questionComments);
      console.log('📝 useUnifiedExam: Flagged questions:', flaggedQuestions);
      
      // SECURITY: Submit to server for secure scoring (no correct answers exposed to frontend)
      const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165`;
      
      const submissionResponse = await fetch(`${serverUrl}/exam/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examId: examSession.id,
          templateId: examSession.template_id,
          examTitle: examSession.title,
          answers: finalAnswers,
          userId: examSession.user_id,
          totalQuestions: examSession.questions.length, // Add total question count for proper scoring
          questionComments: questionComments || {},
          flaggedQuestions: flaggedQuestions || {}
        })
      });
      
      if (!submissionResponse.ok) {
        throw new Error(`Server submission failed: ${submissionResponse.status}`);
      }
      
      const serverResult = await submissionResponse.json();
      
      if (!serverResult.success) {
        throw new Error(serverResult.error || 'Server submission failed');
      }
      
      console.log('✅ useUnifiedExam: Exam submitted successfully via server');
      console.log(`📊 useUnifiedExam: Server calculated ${serverResult.data.correctAnswers} correct answers out of ${serverResult.data.totalQuestions} total questions (${serverResult.data.answeredQuestions} answered)`);
      console.log(`🎯 useUnifiedExam: Final Score: ${serverResult.data.score}%`);
      
      // Clear the session
      setExamSession(null);
      
      return { success: true, data: serverResult.data };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('💥 useUnifiedExam: Error submitting exam:', error);
      return { success: false, error: errorMessage };
    }
  }, [examSession, accessToken]);

  const exitExam = useCallback(() => {
    console.log('🚪 useUnifiedExam: Exiting exam');
    setExamSession(null);
    setError(null);
  }, []);

  return {
    examSession,
    isLoading,
    error,
    startExam,
    submitExam,
    exitExam,
  };
};