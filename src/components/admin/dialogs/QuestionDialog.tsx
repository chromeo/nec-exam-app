import { useState, useEffect } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "../../ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../../ui/select";
import { Checkbox } from "../../ui/checkbox";
import { Tags, Info } from "lucide-react";
import type { Question, QuestionForm, NecEdition } from "../../../supabase/functions/server/types";
import { NEC_EDITIONS } from "../../../supabase/functions/server/types";

interface QuestionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: QuestionForm) => void;
  editingQuestion: Question | null;
  questionCategories: string[];
  onRefreshCategories: () => void;
}

export const QuestionDialog = ({
  isOpen,
  onClose,
  onSave,
  editingQuestion,
  questionCategories,
  onRefreshCategories,
}: QuestionDialogProps) => {
  const [questionForm, setQuestionForm] = useState<QuestionForm>({
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    category: "",
    reference: "",
    difficulty: "Medium",
    status: "Draft", // Default to Draft for new questions
    editions: [], // NEW: Initialize empty editions array
  });
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedEditions, setSelectedEditions] = useState<Set<NecEdition>>(
    new Set(['NEC-2026']) // Default to latest edition
  );
  
  // Track which editions existed when question was loaded (for isValid toggle logic)
  const [originalEditions, setOriginalEditions] = useState<Set<NecEdition>>(new Set());
  
  // Track which editions have custom values (not using defaults)
  const [customizedEditions, setCustomizedEditions] = useState<Set<NecEdition>>(new Set());
  
  // Track custom values per edition
  const [editionCustomValues, setEditionCustomValues] = useState<Record<NecEdition, {
    category: string;
    reference: string;
    notes?: string;
  }>>({} as any);

  // Reset form when dialog opens/closes or editing question changes
  useEffect(() => {
    if (isOpen) {
      if (editingQuestion) {
        setQuestionForm({
          question: editingQuestion.question,
          options: [...editingQuestion.options],
          correctAnswer: editingQuestion.correctAnswer || 0,
          category: editingQuestion.category,
          reference: editingQuestion.reference || "",
          difficulty: editingQuestion.difficulty || "Medium",
          status: editingQuestion.status || "Final",
          editions: editingQuestion.editions || [], // NEW: Set editions from editing question
        });
        setIsCustomCategory(false);
        setNewCategoryName("");
        
        // NEW: Set selected editions from editing question
        if (editingQuestion.editions && editingQuestion.editions.length > 0) {
          setSelectedEditions(new Set(editingQuestion.editions.map(e => e.code)));
          setOriginalEditions(new Set(editingQuestion.editions.map(e => e.code)));
          
          // Detect which editions have custom values (differ from the default category/reference)
          const customized = new Set<NecEdition>();
          const customValues: Record<string, { category: string; reference: string; notes?: string }> = {};
          
          editingQuestion.editions.forEach((edition) => {
            // If this edition's values differ from the question's default, it's customized
            if (
              edition.category !== editingQuestion.category ||
              edition.reference !== editingQuestion.reference ||
              edition.notes
            ) {
              customized.add(edition.code);
              customValues[edition.code] = {
                category: edition.category,
                reference: edition.reference || '',
                notes: edition.notes,
              };
            }
          });
          
          setCustomizedEditions(customized);
          setEditionCustomValues(customValues as any);
        } else {
          // Legacy question without editions - default to NEC-2023 for migration
          setSelectedEditions(new Set(['NEC-2023']));
          setOriginalEditions(new Set(['NEC-2023']));
          setCustomizedEditions(new Set());
          setEditionCustomValues({} as any);
        }
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingQuestion]);

  // Natural sorting function for categories (handles "NEC 90" before "NEC 100")
  const sortCategories = (categories: string[]) => {
    return [...categories].sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  const resetForm = () => {
    const sorted = sortCategories(questionCategories);
    setQuestionForm({
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      category: sorted.length > 0 ? sorted[0] : "",
      reference: "",
      difficulty: "Medium",
      status: "Draft", // Default to Draft for new questions
      editions: [], // NEW: Reset editions array
    });
    setIsCustomCategory(false);
    setNewCategoryName("");
    setSelectedEditions(new Set(['NEC-2026'])); // NEW: Reset selected editions to latest
    setOriginalEditions(new Set(['NEC-2026']));
    setCustomizedEditions(new Set());
    setEditionCustomValues({} as any);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...questionForm.options];
    newOptions[index] = value;
    setQuestionForm(prev => ({ ...prev, options: newOptions }));
  };

  const handleCorrectAnswerChange = (index: number) => {
    setQuestionForm(prev => ({ 
      ...prev, 
      correctAnswer: index 
    }));
  };

  const handleCategoryChange = (value: string) => {
    if (value === "custom") {
      setIsCustomCategory(true);
      setQuestionForm(prev => ({ ...prev, category: "" }));
    } else {
      setIsCustomCategory(false);
      setQuestionForm(prev => ({ ...prev, category: value }));
    }
  };

  const handleEditionChange = (edition: NecEdition) => {
    const currentEditions = new Set(selectedEditions);
    if (currentEditions.has(edition)) {
      currentEditions.delete(edition);
      // Also remove from customized set if it was customized
      const newCustomized = new Set(customizedEditions);
      newCustomized.delete(edition);
      setCustomizedEditions(newCustomized);
    } else {
      currentEditions.add(edition);
    }
    setSelectedEditions(currentEditions);
  };
  
  const handleToggleCustomizeEdition = (edition: NecEdition) => {
    const newCustomized = new Set(customizedEditions);
    
    if (newCustomized.has(edition)) {
      // Uncustomizing - remove from set
      newCustomized.delete(edition);
    } else {
      // Customizing - add to set and initialize with current defaults
      newCustomized.add(edition);
      
      // Initialize with default values if not already set
      if (!editionCustomValues[edition]) {
        setEditionCustomValues(prev => ({
          ...prev,
          [edition]: {
            category: questionForm.category,
            reference: questionForm.reference,
            notes: '',
          }
        }));
      }
    }
    
    setCustomizedEditions(newCustomized);
  };
  
  const handleEditionCustomValueChange = (
    edition: NecEdition,
    field: 'category' | 'reference' | 'notes',
    value: string
  ) => {
    setEditionCustomValues(prev => ({
      ...prev,
      [edition]: {
        ...prev[edition],
        [field]: value,
      }
    }));
  };

  const handleSubmit = () => {
    // Validation
    if (!questionForm.question.trim()) {
      alert("Please enter a question");
      return;
    }

    // Check that all 4 options are filled
    const hasEmptyOptions = questionForm.options.some(option => option.trim() === "");
    if (hasEmptyOptions) {
      alert("Please fill in all 4 answer options");
      return;
    }

    if (!questionForm.reference.trim()) {
      alert("Please enter a reference");
      return;
    }

    // NEW: Validate that at least one edition is selected
    if (selectedEditions.size === 0) {
      alert("Please select at least one NEC edition");
      return;
    }

    let finalCategory = questionForm.category;
    if (isCustomCategory) {
      if (!newCategoryName.trim()) {
        alert("Please enter a category name");
        return;
      }
      finalCategory = newCategoryName.trim();
    } else if (!finalCategory) {
      alert("Please select a category");
      return;
    }

    // NEW: Build editions array with isValid toggle logic
    // Include editions that are: (1) currently checked OR (2) were originally saved
    const editions = NEC_EDITIONS.map(code => {
      const isChecked = selectedEditions.has(code);
      const wasOriginal = originalEditions.has(code);
      
      // Skip if never existed and not selected now
      if (!isChecked && !wasOriginal) {
        return null;
      }
      
      const isCustomized = customizedEditions.has(code);
      const customValues = editionCustomValues[code];
      
      return {
        code,
        category: isCustomized && customValues ? customValues.category : finalCategory,
        reference: isCustomized && customValues ? customValues.reference.trim() : questionForm.reference.trim(),
        isValid: isChecked, // TRUE if checked, FALSE if unchecked (preserves history)
        notes: isCustomized && customValues ? customValues.notes : undefined,
        updatedAt: new Date().toISOString(),
      };
    }).filter(Boolean) as any[]; // Remove nulls

    const finalQuestion: QuestionForm = {
      question: questionForm.question.trim(),
      options: questionForm.options.map(option => option.trim()),
      correctAnswer: questionForm.correctAnswer,
      category: finalCategory,
      reference: questionForm.reference.trim(),
      difficulty: questionForm.difficulty,
      status: questionForm.status,
      editions, // NEW: Add properly formatted editions array
    };

    onSave(finalQuestion);
    
    // Refresh categories if we added a custom one
    if (isCustomCategory) {
      onRefreshCategories();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingQuestion ? "Edit Question" : "Create New Question"}
          </DialogTitle>
          <DialogDescription>
            {editingQuestion 
              ? "Update the question details below." 
              : "Enter the question details below."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Question Text */}
          <div className="space-y-2">
            <Label htmlFor="question">Question *</Label>
            <Textarea
              id="question"
              placeholder="Enter the question text..."
              value={questionForm.question}
              onChange={(e) => setQuestionForm(prev => ({ 
                ...prev, 
                question: e.target.value 
              }))}
              rows={3}
            />
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Answer Options * (4 required)</Label>
              <span className="text-sm text-muted-foreground">Check the correct answer</span>
            </div>
            <div className="space-y-3">
              {questionForm.options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <Input
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    className="flex-1"
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`correct-${index}`}
                      checked={questionForm.correctAnswer === index}
                      onCheckedChange={() => handleCorrectAnswerChange(index)}
                      className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                    />
                    {/* <Label 
                      htmlFor={`correct-${index}`}
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      Correct
                    </Label> */}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Default Category & Reference Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div>
              <h3 className="font-medium text-sm mb-1">Default Category & Reference</h3>
              <p className="text-xs text-muted-foreground">
                Applied to all editions unless customized individually below
              </p>
            </div>

            {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            {!isCustomCategory ? (
              <Select value={questionForm.category} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {sortCategories(questionCategories).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="text-primary">
                    <div className="flex items-center gap-2">
                      <Tags className="h-4 w-4" />
                      Create New Category
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Enter new category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCustomCategory(false);
                    setNewCategoryName("");
                    const sorted = sortCategories(questionCategories);
                    setQuestionForm(prev => ({ 
                      ...prev, 
                      category: sorted.length > 0 ? sorted[0] : "" 
                    }));
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

            {/* Reference (Required) */}
            <div className="space-y-2">
              <Label htmlFor="reference">Reference *</Label>
              <Input
                id="reference"
                placeholder="e.g., 240.4(D)(3), Article 310, Chapter 5"
                value={questionForm.reference}
                onChange={(e) => setQuestionForm(prev => ({ 
                  ...prev, 
                  reference: e.target.value 
                }))}
              />
            </div>
          </div>

          {/* NEC Editions Selector */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-start gap-2">
              <Label className="text-base">NEC Editions *</Label>
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Info className="h-4 w-4" />
                <span className="text-xs">Select which code editions this question applies to</span>
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-3">
              {NEC_EDITIONS.map((edition) => (
                <div key={edition} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edition-${edition}`}
                    checked={selectedEditions.has(edition)}
                    onCheckedChange={() => handleEditionChange(edition)}
                  />
                  <Label
                    htmlFor={`edition-${edition}`}
                    className="text-sm cursor-pointer select-none"
                  >
                    {edition.replace('NEC-', '')}
                  </Label>
                </div>
              ))}
            </div>
            
            {/* Per-Edition Customization Cards */}
            {selectedEditions.size > 0 && (
              <div className="space-y-3 mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Customize individual editions if needed (e.g., reference changed in newer code):
                </p>
                
                {Array.from(selectedEditions).sort().map((edition) => {
                  const isCustomized = customizedEditions.has(edition);
                  const customValues = editionCustomValues[edition];
                  
                  return (
                    <div 
                      key={edition} 
                      className="p-3 border rounded bg-background space-y-3"
                    >
                      {/* Customize Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{edition}</span>
                          {!isCustomized && (
                            <span className="text-xs text-green-600 dark:text-green-400">
                              ✓ Using defaults from above
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`customize-${edition}`}
                            checked={isCustomized}
                            onCheckedChange={() => handleToggleCustomizeEdition(edition)}
                          />
                          <Label
                            htmlFor={`customize-${edition}`}
                            className="text-xs cursor-pointer select-none"
                          >
                            Customize for this edition
                          </Label>
                        </div>
                      </div>
                      
                      {/* Custom Fields (only shown when customized) */}
                      {isCustomized && customValues && (
                        <div className="space-y-3 pt-2 border-t">
                          <div className="space-y-1.5">
                            <Label htmlFor={`${edition}-category`} className="text-xs">
                              Category
                            </Label>
                            <Select 
                              value={customValues.category} 
                              onValueChange={(value) => handleEditionCustomValueChange(edition, 'category', value)}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {sortCategories(questionCategories).map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-1.5">
                            <Label htmlFor={`${edition}-reference`} className="text-xs">
                              Reference
                            </Label>
                            <Input
                              id={`${edition}-reference`}
                              placeholder="e.g., 240.5(A)(2)"
                              value={customValues.reference}
                              onChange={(e) => handleEditionCustomValueChange(edition, 'reference', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <Label htmlFor={`${edition}-notes`} className="text-xs">
                              Notes (optional)
                            </Label>
                            <Textarea
                              id={`${edition}-notes`}
                              placeholder="Explain what changed in this edition..."
                              value={customValues.notes || ''}
                              onChange={(e) => handleEditionCustomValueChange(edition, 'notes', e.target.value)}
                              className="text-sm resize-none"
                              rows={2}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty *</Label>
            <Select 
              value={questionForm.difficulty} 
              onValueChange={(value) => setQuestionForm(prev => ({ 
                ...prev, 
                difficulty: value 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select 
              value={questionForm.status} 
              onValueChange={(value) => setQuestionForm(prev => ({ 
                ...prev, 
                status: value 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Final">Final</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {editingQuestion ? "Update Question" : "Create Question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};