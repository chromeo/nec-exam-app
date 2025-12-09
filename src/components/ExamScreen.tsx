import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { ScrollArea } from './ui/scroll-area'
import { Clock, FileText, Users, Tag, Calendar, DollarSign, Hash, BookOpen } from 'lucide-react'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import type { ExamTemplate, Question } from '../supabase/functions/server/types'
import { getTimeLimit, getQuestionCount } from '../utils/typeConverters'

interface ExamScreenProps {
  accessToken: string
  userId: string
  templateId?: string
  onBack?: () => void
}

export function ExamScreen({ accessToken, userId, templateId, onBack }: ExamScreenProps) {
  const [loading, setLoading] = useState(false)
  const [template, setTemplate] = useState<ExamTemplate | null>(null)
  const [questions, setQuestions] = useState<Record<string, Question[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  // Use the template from our tests, or allow override
  const targetTemplateId = templateId || 'exam-template:1756766366064-fehoo8swk'

  useEffect(() => {
    loadExamData()
  }, [targetTemplateId])

  const loadExamData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165`      
      // 1. Load the exam template
      const templateResponse = await fetch(`${serverUrl}/admin/exam-templates`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      })
      
      if (!templateResponse.ok) {
        throw new Error(`Failed to fetch template: ${templateResponse.status}`)
      }
      
      const templateData = await templateResponse.json()
      
      const foundTemplate = templateData.data?.find((t: ExamTemplate) => t.id === targetTemplateId)      
      if (!foundTemplate) {
        throw new Error(`Template not found: ${targetTemplateId}`)
      }
      
      setTemplate(foundTemplate)
      
      const questionsResponse = await fetch(`${serverUrl}/admin/questions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      })
      
      if (!questionsResponse.ok) {
        throw new Error(`Failed to fetch questions: ${questionsResponse.status}`)
      }
      
      const questionsData = await questionsResponse.json()
      
      const questionsByCategory: Record<string, Question[]> = {}
      
      questionsData.data.forEach((question: Question) => {
        const category = question.category
        if (!questionsByCategory[category]) {
          questionsByCategory[category] = []
        }
        questionsByCategory[category].push(question)
      })
      
      const selectedQuestions: Record<string, Question[]> = {}
      
      if (foundTemplate.questionCategories) {
        Object.entries(foundTemplate.questionCategories).forEach(([categoryName, count]) => {
          const availableQuestions = questionsByCategory[categoryName] || []
          
          if (availableQuestions.length > 0) {
            // Shuffle and select the required number
            const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5)
            selectedQuestions[categoryName] = shuffled.slice(0, count)
          } else {
            console.warn(`No questions found for category: "${categoryName}"`)
            selectedQuestions[categoryName] = []
          }
        })
      }
      
      setQuestions(selectedQuestions)            
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const getAllQuestions = () => {
    return Object.values(questions).flat()
  }

  const getCurrentQuestion = () => {
    const allQuestions = getAllQuestions()
    return allQuestions[currentQuestionIndex] || null
  }

  const getQuestionOptions = (question: Question) => {
    if (question.options && Array.isArray(question.options)) {
      return question.options
    }
    return [
      question.option_a || '',
      question.option_b || '',
      question.option_c || '',
      question.option_d || ''
    ].filter(Boolean)
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">Loading Exam...</div>
          <div className="text-muted-foreground">Fetching template and questions</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Exam</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadExamData} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">No Template Found</div>
          <div className="text-muted-foreground">Unable to load exam template</div>
        </div>
      </div>
    )
  }

  const allQuestions = getAllQuestions()
  const currentQuestion = getCurrentQuestion()
  const totalQuestions = allQuestions.length

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <Button variant="outline" size="sm" onClick={onBack}>
                  ← Back
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-semibold">{template.title}</h1>
                <p className="text-muted-foreground">{template.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                <Clock className="w-4 h-4 mr-1" />
                {getTimeLimit(template)} minutes
              </Badge>
              <Badge variant="outline">
                <Hash className="w-4 h-4 mr-1" />
                {totalQuestions} questions
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left Side - Template Details */}
        <div className="w-1/3 border-r bg-card">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Template Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="text-muted-foreground">ID</label>
                      <p className="font-mono text-xs">{template.id}</p>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Exam Type</label>
                      <p>{template.template_name || 'General'}</p>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Time Limit</label>
                      <p>{getTimeLimit(template)} minutes</p>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Question Count</label>
                      <p>{getQuestionCount(template)}</p>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Price</label>
                      <p className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {template.price ?? 0}
                      </p>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Status</label>
                      <Badge variant={template.is_draft ? "destructive" : "secondary"}>
                        {template.is_draft ? "Draft" : "Published"}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Created</label>
                      <p className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {template.created_at ? new Date(template.created_at).toLocaleDateString() : 
                         template.createdAt ? new Date(template.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Created By</label>
                      <p className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {template.created_by || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  
                  {template.moreDetails && (
                    <div>
                      <label className="text-muted-foreground">Additional Details</label>
                      <div 
                        className="text-sm mt-1 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: template.moreDetails }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Question Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(template.questionCategories || {}).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{category}</p>
                          <p className="text-xs text-muted-foreground">
                            {questions[category]?.length || 0} questions loaded
                          </p>
                        </div>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>

        {/* Right Side - Questions */}
        <div className="flex-1 flex flex-col">
          {/* Question Navigation */}
          <div className="border-b bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3>Question {currentQuestionIndex + 1} of {totalQuestions}</h3>
                <p className="text-sm text-muted-foreground">
                  Category: {currentQuestion?.category || 'Unknown'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentQuestionIndex(Math.min(totalQuestions - 1, currentQuestionIndex + 1))}
                  disabled={currentQuestionIndex === totalQuestions - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          {/* Current Question */}
          <div className="flex-1">
            <ScrollArea className="h-full">
              <div className="p-6">
                {currentQuestion ? (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5" />
                          Question Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="text-muted-foreground">Question ID</label>
                          <p className="font-mono text-xs">{currentQuestion.id}</p>
                        </div>
                        
                        <div>
                          <label className="text-muted-foreground">Question Text</label>
                          <p className="mt-2 p-4 bg-muted rounded-lg">{currentQuestion.question}</p>
                        </div>

                        <div>
                          <label className="text-muted-foreground">Answer Options</label>
                          <div className="mt-2 space-y-2">
                            {getQuestionOptions(currentQuestion).map((option, index) => (
                              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                                  {String.fromCharCode(65 + index)}
                                </div>
                                <p>{option}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-muted-foreground">Correct Answer</label>
                            <Badge variant="secondary" className="mt-1">
                              {currentQuestion.correct_answer || currentQuestion.correctAnswer || 'Not specified'}
                            </Badge>
                          </div>
                          <div>
                            <label className="text-muted-foreground">Category</label>
                            <Badge variant="outline" className="mt-1">
                              {currentQuestion.category}
                            </Badge>
                          </div>
                        </div>

                        {currentQuestion.reference && (
                          <div>
                            <label className="text-muted-foreground">Reference</label>
                            <p className="mt-1 text-sm">{currentQuestion.reference}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <h3>No Questions Available</h3>
                    <p className="text-muted-foreground">No questions were loaded for this exam.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}