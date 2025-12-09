import { useState, useEffect } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Checkbox } from "../../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { 
  Plus, Search, Edit, Trash2, Filter, HelpCircle, Grid, List, 
  ChevronUp, ChevronDown, Download, Upload, Copy, MoreHorizontal,
  Calendar, BookOpen, Star, X, CheckSquare, Square, Layers, RefreshCw,
  AlertTriangle
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "../../ui/dropdown-menu";
import { QuestionDialog } from "../dialogs/QuestionDialog";
import { AdminSectionHeader } from "../AdminSectionHeader";
import { useAdminApi } from "../../../hooks/useAdminApi";
import { useAuthContext } from "../../../contexts/AuthContext";
import { useQuestionCache } from "../../../hooks/useQuestionCache";
import { toast } from "sonner@2.0.3";
import { CompactQuestionCard, DenseQuestionCard, ExpandedQuestionCard } from "./QuestionCardVariants";
import type { 
  QuestionForm as SharedQuestionForm,
  QuestionFilters as SharedQuestionFilters
} from "../../../supabase/functions/server/types";

// Admin-specific Question interface that matches server response format
interface Question {
  id: string;
  question: string;  // Server returns 'question' field for question text
  options: string[]; // Server returns 'options' array for answer choices
  correctAnswer: number; // Server returns correctAnswer as index
  category: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  status?: 'Draft' | 'Final';
  reference?: string;
  createdAt: string;
  updatedAt?: string;
  examCategories?: string[];
  questionCategory?: string;
}

// Admin-specific form interface
interface QuestionForm {
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  status?: 'Draft' | 'Final';
  reference?: string;
}

// Admin-specific filters interface  
interface QuestionFilters {
  searchTerm: string;
  category: string;
  difficulty: string;
  dateFrom: string;
  dateTo: string;
  hasReference: boolean | null;
  status: string;
}

interface QuestionsSectionProps {
  questionCategories: string[];
  onRefreshCategories: () => void;
  preselectedCategory?: string | null;
  accessToken: string;
}

export const QuestionsSection = ({ 
  questionCategories, 
  onRefreshCategories,
  preselectedCategory,
  accessToken
}: QuestionsSectionProps) => {
  const { logout } = useAuthContext();
  const { makeRequest, isLoading, error } = useAdminApi(accessToken);
  const {
    rawQuestions: questions,
    getFilteredQuestions,
    updateQuestions,
    updateQuestionInCache,
    addQuestionToCache,
    removeQuestionFromCache,
    clearCache,
    getCacheStats
  } = useQuestionCache({ cacheTimeout: 5 * 60 * 1000 }); // 5 minute cache
  
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  
  // Enhanced filtering state
  const [filters, setFilters] = useState<QuestionFilters>({
    searchTerm: "",
    category: "All",
    difficulty: "All",
    dateFrom: "",
    dateTo: "",
    hasReference: null,
    status: "All"
  });
  
  // Selection and bulk operations state
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Import/Export state
  const [importData, setImportData] = useState<string>("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  // UI state
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [cardDensity, setCardDensity] = useState<'compact' | 'dense' | 'expanded'>('compact');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Question;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Load questions on component mount
  useEffect(() => {
    loadQuestions();
  }, []);

  // Set preselected category filter when it changes
  useEffect(() => {
    if (preselectedCategory) {
      setFilters(prev => ({ ...prev, category: preselectedCategory }));
    }
  }, [preselectedCategory]);

  // Enhanced filtering and sorting effect with caching
  useEffect(() => {
    // Use cached filtering
    const filtered = getFilteredQuestions(questions, filters, sortConfig);
    setFilteredQuestions(filtered);
    
    // Update selection state
    const newSelectedQuestions = new Set([...selectedQuestions].filter(id => 
      filtered.some(q => q.id === id)
    ));
    setSelectedQuestions(newSelectedQuestions);
    setSelectAll(newSelectedQuestions.size === filtered.length && filtered.length > 0);
    setShowBulkActions(newSelectedQuestions.size > 0);
  }, [questions, filters, sortConfig, selectedQuestions, getFilteredQuestions]);

  const loadQuestions = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        clearCache();
      }
      
      const result = await makeRequest('/admin/questions', { method: 'GET' });
      if (result.success && result.data) {
        // Ensure questions is an array and map field names properly
        const questionsData = Array.isArray(result.data) ? result.data : [];
        // Map server field names to frontend field names
        const mappedQuestions = questionsData.map((q: any) => ({
          ...q,
          // Strip the 'question:' prefix from the ID for frontend use
          id: q.id?.startsWith('question:') ? q.id.replace('question:', '') : q.id,
          createdAt: q.created_at || q.createdAt || new Date().toISOString(),
          updatedAt: q.updated_at || q.updatedAt,
          difficulty: q.difficulty || 'Medium', // Ensure difficulty has a default value
          status: q.status || 'Draft' // Ensure status has a default value and default to Draft
        }));
        updateQuestions(mappedQuestions);
      } else {
        console.error('Failed to load questions:', result.error);
        updateQuestions([]); // Set empty array on error
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      updateQuestions([]); // Set empty array on error
    }
  };

  const handleCreateQuestion = () => {
    setEditingQuestion(null);
    setIsQuestionDialogOpen(true);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setIsQuestionDialogOpen(true);
  };

  // Utility function to check if a question meets current filter criteria
  const questionMeetsFilters = (question: Question, currentFilters: QuestionFilters): boolean => {
    // Text search
    if (currentFilters.searchTerm) {
      const searchLower = currentFilters.searchTerm.toLowerCase();
      const matchesSearch = 
        question.question.toLowerCase().includes(searchLower) ||
        question.options.some((option) => option.toLowerCase().includes(searchLower)) ||
        (question.reference && question.reference.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }

    // Category filter
    if (currentFilters.category !== "All" && question.category !== currentFilters.category) {
      return false;
    }

    // Difficulty filter
    if (currentFilters.difficulty !== "All" && question.difficulty !== currentFilters.difficulty) {
      return false;
    }

    // Date range filter
    if (currentFilters.dateFrom) {
      const fromDate = new Date(currentFilters.dateFrom);
      if (new Date(question.createdAt) < fromDate) return false;
    }
    if (currentFilters.dateTo) {
      const toDate = new Date(currentFilters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      if (new Date(question.createdAt) > toDate) return false;
    }

    // Reference filter
    if (currentFilters.hasReference !== null) {
      const hasRef = question.reference && question.reference.trim() !== "";
      if (currentFilters.hasReference && !hasRef) return false;
      if (!currentFilters.hasReference && hasRef) return false;
    }

    // Status filter
    if (currentFilters.status !== "All" && question.status !== currentFilters.status) {
      return false;
    }

    return true;
  };

  const handleSaveQuestion = async (questionData: QuestionForm) => {
    try {
      let result;
      const isEditing = !!editingQuestion;
      
      if (editingQuestion) {
        result = await makeRequest(`/admin/questions/${editingQuestion.id}`, {
          method: 'PUT',
          body: JSON.stringify(questionData)
        });
        
        if (result.success) {
          // Optimistically update the question in cache
          const updatedQuestion: Question = {
            ...editingQuestion,
            ...questionData,
            updatedAt: new Date().toISOString()
          };
          updateQuestionInCache(updatedQuestion);
          
          // Check if the updated question still meets current filter criteria
          const stillMeetsFilters = questionMeetsFilters(updatedQuestion, filters);
          
          if (stillMeetsFilters) {
            toast.success("Question updated successfully");
          } else {
            // Question no longer meets filter criteria - force immediate cache clear and UI update
            clearCache();
            
            // Remove from current selection if it was selected
            setSelectedQuestions(prev => {
              const newSet = new Set(prev);
              newSet.delete(updatedQuestion.id);
              return newSet;
            });
            
            const hasActiveFilters = filters.searchTerm || 
              filters.category !== "All" || 
              filters.difficulty !== "All" || 
              filters.dateFrom || 
              filters.dateTo || 
              filters.hasReference !== null || 
              filters.status !== "All";
            
            if (hasActiveFilters) {
              toast.success("Question updated successfully", {
                description: "The question has been removed from the current filtered view as it no longer matches the active filters."
              });
            } else {
              toast.success("Question updated successfully");
            }
          }
        }
      } else {
        result = await makeRequest('/admin/questions', {
          method: 'POST',
          body: JSON.stringify(questionData)
        });
        
        if (result.success && result.data) {
          // Optimistically add the new question to cache
          const newQuestion: Question = {
            ...result.data,
            id: result.data.id?.startsWith('question:') ? result.data.id.replace('question:', '') : result.data.id,
            createdAt: result.data.created_at || result.data.createdAt || new Date().toISOString(),
            updatedAt: result.data.updated_at || result.data.updatedAt,
            difficulty: result.data.difficulty || 'Medium',
            status: result.data.status || 'Draft'
          };
          addQuestionToCache(newQuestion);
          
          // Check if the new question meets current filter criteria
          const meetsFilters = questionMeetsFilters(newQuestion, filters);
          
          if (meetsFilters) {
            toast.success("Question created successfully");
          } else {
            // New question doesn't meet current filter criteria - force cache refresh for immediate UI update
            clearCache();
            
            const hasActiveFilters = filters.searchTerm || 
              filters.category !== "All" || 
              filters.difficulty !== "All" || 
              filters.dateFrom || 
              filters.dateTo || 
              filters.hasReference !== null || 
              filters.status !== "All";
            
            if (hasActiveFilters) {
              toast.success("Question created successfully", {
                description: "The new question is not visible in the current filtered view. Clear filters to see all questions."
              });
            } else {
              toast.success("Question created successfully");
            }
          }
        }
      }

      if (result.success) {
        setIsQuestionDialogOpen(false);
        setEditingQuestion(null);
        onRefreshCategories(); // Refresh categories in case a new one was added
      } else {
        toast.error(`Failed to ${editingQuestion ? 'update' : 'create'} question: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error(`Error ${editingQuestion ? 'updating' : 'creating'} question`);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) {
      return;
    }

    const result = await makeRequest(`/admin/questions/${questionId}`, {
      method: 'DELETE'
    });
    
    if (result.success) {
      // Optimistically remove the question from cache
      removeQuestionFromCache(questionId);
      toast.success("Question deleted successfully");
    } else {
      console.error('Delete failed:', result.error);
      toast.error(`Failed to delete question: ${result.error}`);
    }
  };

  const handleSort = (key: keyof Question) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'No date';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const uniqueCategories = Array.from(new Set(questions.map((q) => q.category))).sort();
  const uniqueDifficulties = Array.from(new Set(questions.map((q) => q.difficulty).filter(Boolean))).sort();

  // Selection management
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuestions(new Set(filteredQuestions.map(q => q.id)));
    } else {
      setSelectedQuestions(new Set());
    }
    setSelectAll(checked);
  };

  const handleSelectQuestion = (questionId: string, checked: boolean) => {
    const newSelected = new Set(selectedQuestions);
    if (checked) {
      newSelected.add(questionId);
    } else {
      newSelected.delete(questionId);
    }
    setSelectedQuestions(newSelected);
    setSelectAll(newSelected.size === filteredQuestions.length && filteredQuestions.length > 0);
  };

  // Bulk operations
  const handleBulkOperation = async (operation: string, targetValue?: string) => {
    if (selectedQuestions.size === 0) {
      toast.error("No questions selected");
      return;
    }

    const questionIds = Array.from(selectedQuestions);
    let confirmMessage = "";
    
    switch (operation) {
      case 'delete':
        confirmMessage = `Are you sure you want to delete ${questionIds.length} questions?`;
        break;
      case 'changeCategory':
        confirmMessage = `Change category for ${questionIds.length} questions to "${targetValue}"?`;
        break;
      case 'changeDifficulty':
        confirmMessage = `Change difficulty for ${questionIds.length} questions to "${targetValue}"?`;
        break;
    }

    if (!confirm(confirmMessage)) return;

    try {
      const result = await makeRequest('/admin/questions/bulk', {
        method: 'POST',
        body: JSON.stringify({ operation, questionIds: Array.from(questionIds), targetValue })
      });
      if (result.success) {
        toast.success(result.data.message);
        setSelectedQuestions(new Set());
        setSelectAll(false);
        // Force refresh for bulk operations to ensure data consistency
        await loadQuestions(true);
      } else {
        toast.error(result.error || "Bulk operation failed");
      }
    } catch (error) {
      console.error('Bulk operation error:', error);
      toast.error("Failed to perform bulk operation");
    }
  };

  // Import/Export functions
  const handleExport = () => {
    const exportData = {
      questions: selectedQuestions.size > 0 
        ? filteredQuestions.filter(q => selectedQuestions.has(q.id))
        : filteredQuestions,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        totalCount: selectedQuestions.size > 0 ? selectedQuestions.size : filteredQuestions.length
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${exportData.questions.length} questions`);
  };

  const handleExportCSV = () => {
    const questionsToExport = selectedQuestions.size > 0 
      ? filteredQuestions.filter(q => selectedQuestions.has(q.id))
      : filteredQuestions;

    const csvHeader = "Question,Option A,Option B,Option C,Option D,Correct Answer,Category,Difficulty,Reference,Created At\n";
    const csvContent = questionsToExport.map(q => {
      const correctOption = q.options[q.correctAnswer || 0];
      return [
        `"${q.question.replace(/"/g, '""')}"`,
        `"${q.options[0]?.replace(/"/g, '""') || ''}"`,
        `"${q.options[1]?.replace(/"/g, '""') || ''}"`,
        `"${q.options[2]?.replace(/"/g, '""') || ''}"`,
        `"${q.options[3]?.replace(/"/g, '""') || ''}"`,
        `"${correctOption?.replace(/"/g, '""') || ''}"`,
        `"${q.category || ''}"`,
        `"${q.difficulty || 'Medium'}"`,
        `"${q.reference?.replace(/"/g, '""') || ''}"`,
        `"${q.createdAt || ''}"`,
      ].join(',');
    }).join('\n');

    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${questionsToExport.length} questions to CSV`);
  };

  const handleImport = async () => {
    if (!importData.trim()) {
      toast.error("Please paste JSON data to import");
      return;
    }

    try {
      const data = JSON.parse(importData);
      const questionsToImport = data.questions || data; // Support both formats

      if (!Array.isArray(questionsToImport)) {
        toast.error("Invalid format: Expected an array of questions");
        return;
      }

      const result = await makeRequest('/admin/questions/import', {
        method: 'POST',
        body: JSON.stringify({ questions: questionsToImport, skipDuplicates: false })
      });
      if (result.success) {
        toast.success(`Successfully imported ${result.data.importedCount} questions`);
        if (result.data.skippedCount > 0) {
          toast.warning(`Skipped ${result.data.skippedCount} questions`);
        }
        setImportData("");
        setShowImportDialog(false);
        // Force refresh for imports to ensure data consistency
        await loadQuestions(true);
      } else {
        toast.error(result.error || "Import failed");
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error("Invalid JSON format");
    }
  };

  const handleImportNEC2023 = async () => {
    // Simulate importing NEC 2023 questions
    const result = await makeRequest('/admin/questions/import-nec-2023', {
      method: 'POST'
    });
    if (result.success) {
      toast.success(`Successfully imported ${result.data.importedCount} NEC 2023 questions`);
      if (result.data.skippedCount > 0) {
        toast.warning(`Skipped ${result.data.skippedCount} questions`);
      }
      // Force refresh for imports to ensure data consistency
      await loadQuestions(true);
    } else {
      toast.error(result.error || "Import failed");
    }
  };

  const handleMigrateStatus = async () => {
    // Simulate migrating existing questions to final status
    const result = await makeRequest('/admin/questions/migrate-status', {
      method: 'POST'
    });
    if (result.success) {
      toast.success(`Successfully migrated ${result.data.migratedCount} questions`);
      if (result.data.skippedCount > 0) {
        toast.warning(`Skipped ${result.data.skippedCount} questions`);
      }
      // Force refresh for migrations to ensure data consistency
      await loadQuestions(true);
    } else {
      toast.error(result.error || "Migration failed");
    }
  };

  // Filter management
  const updateFilter = (key: keyof QuestionFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // Note: Cache automatically handles filter changes via the useEffect
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: "",
      category: "All",
      difficulty: "All",
      dateFrom: "",
      dateTo: "",
      hasReference: null,
      status: "All"
    });
    // Cache will be invalidated automatically when filters change
  };

  return (
    <div className="p-6 pt-0 space-y-6">
      {/* Header */}
      <AdminSectionHeader
        title="Questions Management"
        description="Create and manage exam questions"
      >
        {/* Simple Loading State */}
        {isLoading && (
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading questions...</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {/* Bulk Actions */}
          {showBulkActions && (
            <div className="flex items-center gap-2 mr-4 p-2 bg-primary/10 rounded-lg border">
              <span className="text-sm font-medium text-primary">
                {selectedQuestions.size} selected
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Bulk Actions <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem 
                    onClick={() => handleBulkOperation('delete')}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {questionCategories.map(category => (
                    <DropdownMenuItem 
                      key={category}
                      onClick={() => handleBulkOperation('changeCategory', category)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Move to {category}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  {['Easy', 'Medium', 'Hard'].map(difficulty => (
                    <DropdownMenuItem 
                      key={difficulty}
                      onClick={() => handleBulkOperation('changeDifficulty', difficulty)}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Set to {difficulty}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          
          <Badge variant="secondary" className="px-3 py-1">
            Total Questions: {questions.length}
          </Badge>
                    
          {/* Import/Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export JSON {selectedQuestions.size > 0 && `(${selectedQuestions.size})`}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV {selectedQuestions.size > 0 && `(${selectedQuestions.size})`}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowImportDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import Questions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImportNEC2023}>
                <BookOpen className="h-4 w-4 mr-2" />
                Import NEC 2023 Questions (1000+)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleMigrateStatus}>
                <Calendar className="h-4 w-4 mr-2" />
                Migrate Existing Questions to Final Status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          {/* Card Density Selector - Only show when in card mode */}
          {viewMode === 'cards' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  {cardDensity === 'compact' && 'Compact'}
                  {cardDensity === 'dense' && 'Dense'}
                  {cardDensity === 'expanded' && 'Expanded'}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setCardDensity('dense')}>
                  <span className="font-medium">Dense</span>
                  <span className="text-xs text-muted-foreground ml-auto">Ultra compact</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCardDensity('compact')}>
                  <span className="font-medium">Compact</span>
                  <span className="text-xs text-muted-foreground ml-auto">Balanced</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCardDensity('expanded')}>
                  <span className="font-medium">Expanded</span>
                  <span className="text-xs text-muted-foreground ml-auto">Full detail</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button onClick={handleCreateQuestion} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        </div>
      </AdminSectionHeader>



      {/* API Error Display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm text-destructive font-medium">Error:</span>
            <span className="text-sm text-destructive">{error}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="sticky top-0 z-10 bg-background p-4">
          <div className="flex flex-col gap-4">
            {/* Basic Filters Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions, options, or references..."
                    value={filters.searchTerm}
                    onChange={(e) => updateFilter('searchTerm', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select 
                  value={filters.category} 
                  onValueChange={(value) => updateFilter('category', value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    {uniqueCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select 
                  value={filters.difficulty} 
                  onValueChange={(value) => updateFilter('difficulty', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Levels</SelectItem>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Advanced
                  {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium mb-2 block">Date From</label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Date To</label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => updateFilter('dateTo', e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Reference</label>
                  <Select 
                    value={filters.hasReference === null ? "All" : filters.hasReference ? "Yes" : "No"} 
                    onValueChange={(value) => updateFilter('hasReference', value === "All" ? null : value === "Yes")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="Yes">Has Reference</SelectItem>
                      <SelectItem value="No">No Reference</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select 
                    value={filters.status} 
                    onValueChange={(value) => updateFilter('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Statuses</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 lg:col-span-4 flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Showing {filteredQuestions.length} of {questions.length} questions
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-lg">Loading questions...</div>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-lg font-medium text-muted-foreground mb-2">
              {questions.length === 0 ? "No questions found" : "No questions match your filters"}
            </div>
            {questions.length === 0 && (
              <Button onClick={handleCreateQuestion} className="mt-4">
                Create Your First Question
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'cards' ? (
        <div className={`${cardDensity === 'expanded' ? 'space-y-6' : cardDensity === 'dense' ? 'space-y-2' : 'space-y-3'}`}>
          {filteredQuestions.map((question) => {
            const cardProps = {
              question,
              isSelected: selectedQuestions.has(question.id),
              onSelect: (checked: boolean) => handleSelectQuestion(question.id, checked),
              onEdit: () => handleEditQuestion(question),
              onDelete: () => handleDeleteQuestion(question.id),
              formatDate
            };

            if (cardDensity === 'dense') {
              return <DenseQuestionCard key={question.id} {...cardProps} />;
            } else if (cardDensity === 'expanded') {
              return <ExpandedQuestionCard key={question.id} {...cardProps} />;
            } else {
              return <CompactQuestionCard key={question.id} {...cardProps} />;
            }
          })}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[40%] max-w-[300px]">Question</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-1">
                    Category
                    {sortConfig?.key === 'category' && (
                      sortConfig.direction === 'asc' ? 
                        <ChevronUp className="h-4 w-4" /> : 
                        <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-1">
                    Date Created
                    {sortConfig?.key === 'createdAt' && (
                      sortConfig.direction === 'asc' ? 
                        <ChevronUp className="h-4 w-4" /> : 
                        <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions.map((question) => (
                <TableRow key={question.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Checkbox
                      checked={selectedQuestions.has(question.id)}
                      onCheckedChange={(checked) => handleSelectQuestion(question.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <div className="space-y-2">
                      <div className="font-medium line-clamp-3 break-words">{question.question}</div>
                      {question.reference && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          Ref: {question.reference}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[12px] bg-primary/10 text-primary">{question.category}</Badge>
                  </TableCell>
                  <TableCell>
                    {question.difficulty && (
                      <Badge 
                        variant="outline" 
                        className={`text-[12px] ${
                          question.difficulty === 'Easy' ? 'bg-chart-2/10 text-chart-2' :
                          question.difficulty === 'Medium' ? 'bg-chart-4/10 text-chart-4' : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {question.difficulty}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatDate(question.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditQuestion(question)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Question Dialog */}
      <QuestionDialog
        isOpen={isQuestionDialogOpen}
        onClose={() => {
          setIsQuestionDialogOpen(false);
          setEditingQuestion(null);
        }}
        onSave={handleSaveQuestion}
        editingQuestion={editingQuestion}
        questionCategories={questionCategories}
        onRefreshCategories={onRefreshCategories}
      />

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle>Import Questions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Paste JSON data containing questions to import. The format should be an array of question objects.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">JSON Data</label>
                <textarea
                  className="w-full h-64 p-3 border rounded-md resize-none font-mono text-sm"
                  placeholder={`[\n  {\n    "question": "What is the capital of France?",\n    "options": ["London", "Berlin", "Paris", "Madrid"],\n    "correctAnswer": 2,\n    "category": "Geography",\n    "difficulty": "Easy",\n    "reference": "Geography textbook Ch. 1"\n  }\n]`}
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowImportDialog(false);
                    setImportData("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleImport}>
                  Import Questions
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};