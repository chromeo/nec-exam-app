import * as kv from './kv_store.ts';
import { Keys, KeyPatterns } from './keys.ts';
import type { UserProfileStats } from './types.ts';

export async function getUserProfileStats(userId: string): Promise<UserProfileStats> {
  try {
    // Fetch ALL exam results (results are not currently indexed by userId)
    // Note: Results are stored as result:{examId}, not indexed by user
    // We fetch all and filter by userId (matches admin results endpoint pattern)
    const allResultsNew = await kv.getByPrefix(KeyPatterns.allResults());
    const allResultsOld = await kv.getByPrefix(KeyPatterns.allResultsOld());
    
    const allResults = [...allResultsNew, ...allResultsOld];
    
    // Filter to only this user's results and parse + enrich the data
    const userResultsPromises = allResults
      .map(async (item) => {
        // Parse the result data (handle both string and object formats)
        let resultData: any = null;
        if (typeof item.value === 'string') {
          try {
            resultData = JSON.parse(item.value);
            // Handle double-encoded data
            if (typeof resultData === 'string') {
              resultData = JSON.parse(resultData);
            }
          } catch (e) {
            console.error('Failed to parse result JSON:', e);
            return null;
          }
        } else {
          resultData = item.value;
        }
        
        // Filter by userId
        if (!resultData || resultData.userId !== userId) {
          return null;
        }
        
        // Enrich with template data to get title
        let templateTitle = resultData.examTitle || 'Unknown Exam';
        
        if (resultData.templateId) {
          try {
            const template = await kv.get(Keys.template(resultData.templateId));
            if (template) {
              const templateData = typeof template === 'string' ? JSON.parse(template) : template;
              templateTitle = templateData.title || templateTitle;
            }
          } catch (e) {
            console.warn(`Failed to get template for ${resultData.templateId}:`, e);
          }
        }
        
        // Return enriched result with normalized field names
        return {
          id: resultData.examId || item.key,
          examId: resultData.examId,
          userId: resultData.userId,
          templateId: resultData.templateId,
          templateTitle,
          totalQuestions: resultData.totalQuestions || 0,
          correctAnswers: resultData.correctAnswers || 0,
          percentage: resultData.score || 0, // 'score' field contains percentage
          timeSpent: 0, // Results don't store timeSpent currently
          completedAt: resultData.completedAt,
          answers: resultData.answers || {},
        };
      });
    
    const userResultsRaw = await Promise.all(userResultsPromises);
    const userResults = userResultsRaw.filter((r): r is NonNullable<typeof r> => r !== null);
    
    // Deduplicate by examId (some old data might have duplicates)
    const uniqueResults = Array.from(
      new Map(userResults.map(r => [r.examId || r.id, r])).values()
    );
    
    // Sort by completion date (newest first)
    uniqueResults.sort((a, b) => 
      new Date(b.completedAt || 0).getTime() - 
      new Date(a.completedAt || 0).getTime()
    );
    
    if (uniqueResults.length === 0) {
      // Return empty stats for users with no exams
      return {
        totalExamsTaken: 0,
        totalTimeSpent: 0,
        averageScore: 0,
        bestScore: 0,
        currentStreak: 0,
        totalQuestions: 0,
        questionsCorrect: 0,
        lastExamDate: null,
        memberSince: new Date().toISOString(),
        examHistory: []
      };
    }
    
    // Calculate aggregate statistics
    const totalExamsTaken = uniqueResults.length;
    const totalTimeSpent = uniqueResults.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
    const totalQuestions = uniqueResults.reduce((sum, r) => sum + (r.totalQuestions || 0), 0);
    const questionsCorrect = uniqueResults.reduce((sum, r) => sum + (r.correctAnswers || 0), 0);
    
    const averageScore = totalExamsTaken > 0
      ? uniqueResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalExamsTaken
      : 0;
    
    const bestScore = totalExamsTaken > 0
      ? Math.max(...uniqueResults.map(r => r.percentage || 0))
      : 0;
    
    // Calculate current streak (consecutive days with exams)
    const currentStreak = calculateStreak(uniqueResults);
    
    // Last exam date
    const lastExamDate = uniqueResults[0]?.completedAt || null;
    
    // Build exam history (most recent 10 exams)
    const examHistory = uniqueResults.slice(0, 10).map(result => ({
      id: result.id,
      title: result.templateTitle || 'Untitled Exam',
      score: Math.round(result.percentage || 0),
      totalQuestions: result.totalQuestions || 0,
      timeSpent: Math.round((result.timeSpent || 0) / 60), // Convert seconds to minutes
      date: result.completedAt || new Date().toISOString()
    }));
    
    return {
      totalExamsTaken,
      totalTimeSpent: Math.round(totalTimeSpent / 60), // Convert seconds to minutes
      averageScore: Math.round(averageScore * 10) / 10, // 1 decimal place
      bestScore: Math.round(bestScore),
      currentStreak,
      totalQuestions,
      questionsCorrect,
      lastExamDate,
      memberSince: new Date().toISOString(), // Will be overridden by actual user created_at
      examHistory
    };
    
  } catch (error) {
    console.error('Error calculating user profile stats:', error);
    throw error;
  }
}

function calculateStreak(results: any[]): number {
  if (results.length === 0) return 0;
  
  // Sort by date (newest first)
  const sortedResults = [...results].sort((a, b) => 
    new Date(b.completedAt || 0).getTime() - 
    new Date(a.completedAt || 0).getTime()
  );
  
  // Get unique dates (YYYY-MM-DD format)
  const examDates = Array.from(new Set(
    sortedResults.map(r => {
      const date = new Date(r.completedAt || 0);
      return date.toISOString().split('T')[0];
    })
  ));
  
  if (examDates.length === 0) return 0;
  
  // Check if most recent exam was today or yesterday
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  if (examDates[0] !== today && examDates[0] !== yesterday) {
    return 0; // Streak broken
  }
  
  // Count consecutive days
  let streak = 1;
  let currentDate = new Date(examDates[0]);
  
  for (let i = 1; i < examDates.length; i++) {
    const expectedDate = new Date(currentDate.getTime() - 86400000);
    const expectedDateStr = expectedDate.toISOString().split('T')[0];
    
    if (examDates[i] === expectedDateStr) {
      streak++;
      currentDate = expectedDate;
    } else {
      break; // Streak broken
    }
  }
  
  return streak;
}
