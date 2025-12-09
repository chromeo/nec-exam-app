import { useState, useEffect } from "react";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { CategoryDialog } from "../dialogs/CategoryDialog";
import { AdminSectionHeader } from "../AdminSectionHeader";
import { useAdminApi } from "../../../hooks/useAdminApi";
import { toast } from "sonner@2.0.3";

interface QuestionCategoriesSectionProps {
  onNavigateToQuestions?: (preselectedCategory: string) => void;
  accessToken: string;
}

export const QuestionCategoriesSection = ({ onNavigateToQuestions, accessToken }: QuestionCategoriesSectionProps) => {
  const { questionCategoriesApi, questionsApi, isLoading } = useAdminApi(accessToken);
  const [categories, setCategories] = useState<string[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});

  // Utility function for consistent category sorting with natural/alphanumeric sorting
  // Sorts: Pure numbers first (1, 2, 3... 1000), then natural alphanumeric (NEC 90 before NEC 800-830)
  const sortCategories = (categories: string[]): string[] => {
    return [...categories].sort((a, b) => {
      const aStr = a.toString();
      const bStr = b.toString();
      
      // Check if both are pure numbers
      const aNum = parseFloat(aStr);
      const bNum = parseFloat(bStr);
      const aIsPureNumber = !isNaN(aNum) && aStr.trim() === aNum.toString();
      const bIsPureNumber = !isNaN(bNum) && bStr.trim() === bNum.toString();
      
      if (aIsPureNumber && bIsPureNumber) {
        // Both are pure numbers, sort numerically (1, 2, 3... 1000)
        return aNum - bNum;
      } else if (aIsPureNumber) {
        // a is pure number, b is text - numbers come first
        return -1;
      } else if (bIsPureNumber) {
        // a is text, b is pure number - numbers come first
        return 1;
      } else {
        // Both are text or mixed - use natural sorting for alphanumeric strings
        return naturalSort(aStr, bStr);
      }
    });
  };

  // Natural sorting function to handle mixed alphanumeric strings
  const naturalSort = (a: string, b: string): number => {
    const aNorm = a.toLowerCase();
    const bNorm = b.toLowerCase();
    
    // Split strings into chunks of text and numbers
    const aChunks = aNorm.match(/(\d+|\D+)/g) || [];
    const bChunks = bNorm.match(/(\d+|\D+)/g) || [];
    
    const maxLength = Math.max(aChunks.length, bChunks.length);
    
    for (let i = 0; i < maxLength; i++) {
      const aChunk = aChunks[i] || '';
      const bChunk = bChunks[i] || '';
      
      // Check if both chunks are numbers
      const aNum = parseFloat(aChunk);
      const bNum = parseFloat(bChunk);
      const aIsNum = !isNaN(aNum) && /^\d+$/.test(aChunk);
      const bIsNum = !isNaN(bNum) && /^\d+$/.test(bChunk);
      
      if (aIsNum && bIsNum) {
        // Both are numbers, compare numerically
        const numDiff = aNum - bNum;
        if (numDiff !== 0) return numDiff;
      } else if (aIsNum) {
        // a is number, b is text - numbers come first
        return -1;
      } else if (bIsNum) {
        // a is text, b is number - numbers come first
        return 1;
      } else {
        // Both are text, compare alphabetically
        const textDiff = aChunk.localeCompare(bChunk);
        if (textDiff !== 0) return textDiff;
      }
    }
    
    return 0;
  };

  useEffect(() => {
    loadCategories();
    loadQuestionCounts();
  }, []);

  const loadCategories = async () => {
    const result = await questionCategoriesApi.getAll();
    if (result.success && result.data) {
      setCategories(sortCategories(result.data));
    }
  };

  const loadQuestionCounts = async () => {
    const result = await questionsApi.getAll();
    if (result.success && result.data) {
      const counts: Record<string, number> = {};
      result.data.forEach((question) => {
        counts[question.category] = (counts[question.category] || 0) + 1;
      });
      setQuestionCounts(counts);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    const result = await questionCategoriesApi.create(newCategoryName.trim());
    if (result.success) {
      toast.success("Question category created successfully");
      setNewCategoryName("");
      setIsAddingNew(false);
      loadCategories();
      loadQuestionCounts();
    } else {
      toast.error(result.error || "Failed to create question category");
    }
  };

  const handleEditCategory = (category: string) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  const handleUpdateCategory = async (oldName: string, newName: string) => {
    const result = await questionCategoriesApi.update(oldName, newName);
    if (result.success) {
      toast.success("Question category updated successfully");
      setEditingCategory(null);
      setIsDialogOpen(false);
      loadCategories();
      loadQuestionCounts();
    } else {
      toast.error(result.error || "Failed to update question category");
    }
  };

  const handleDeleteCategory = async (category: string) => {
    if (!confirm(`Are you sure you want to delete the question category "${category}"? All questions using this category will be moved to "General".`)) {
      return;
    }

    const result = await questionCategoriesApi.delete(category);
    if (result.success) {
      toast.success("Question category deleted successfully");
      loadCategories();
      loadQuestionCounts();
    } else {
      toast.error(result.error || "Failed to delete question category");
    }
  };

  const handleAddMoreQuestions = (category: string) => {
    if (onNavigateToQuestions) {
      onNavigateToQuestions(category);
    }
  };

  return (
    <div className="p-6 pt-0 space-y-6">
      {/* Header */}
      <AdminSectionHeader
        title="Question Categories"
        description="Manage categories for individual questions"
      >
        <Button 
          onClick={() => setIsAddingNew(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </AdminSectionHeader>

      {/* Add New Category */}
      {isAddingNew && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter new category name"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCategory();
                  }
                }}
              />
              <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                Save
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                setIsAddingNew(false);
                setNewCategoryName("");
              }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Categories List
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {categories.length} total
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Natural Sort (1-1000, NEC 90, NEC 800-830)
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No question categories found
            </div>
          ) : (
            <div className="space-y-2">
              {sortCategories(categories).map((category) => {
                const questionCount = questionCounts[category] || 0;
                const isLowQuestionCount = questionCount < 10;
                
                return (
                  <div 
                    key={category} 
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      isLowQuestionCount 
                        ? 'text-base border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/50' 
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={isLowQuestionCount ? 'text-red-900 dark:text-red-100' : ''}>{category}</span>
                      <Badge 
                        variant="outline" 
                        className={
                          isLowQuestionCount
                            ? "text-base bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700 font-semibold"
                            : "text-base bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-800"
                        }
                      >
                        {questionCount} questions {isLowQuestionCount && '⚠️'}
                      </Badge>
                    </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddMoreQuestions(category)}
                      className={`flex items-center gap-1 ${
                        isLowQuestionCount
                          ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold'
                          : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                      {isLowQuestionCount ? 'Need More!' : 'Add More'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCategory(category)}
                      className="flex items-center gap-1"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(category)}
                      className="flex items-center gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Category Dialog */}
      <CategoryDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleUpdateCategory}
        editingCategory={editingCategory}
        categoryType="question"
      />
    </div>
  );
};