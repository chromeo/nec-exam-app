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
import { Badge } from "../../ui/badge";
import { X, BookOpen } from "lucide-react";
import type { ExamTemplate, TemplateForm, NecEdition } from "../../../supabase/functions/server/types";
import { NEC_EDITIONS } from "../../../supabase/functions/server/types";

interface ExamTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: TemplateForm) => void;
  editingTemplate: ExamTemplate | null;
  questionCategories: string[];
}

export const ExamTemplateDialog = ({
  isOpen,
  onClose,
  onSave,
  editingTemplate,
  questionCategories,
}: ExamTemplateDialogProps) => {
  const [templateForm, setTemplateForm] = useState<TemplateForm>({
    title: '',
    description: '',
    questionCount: 10,
    timeLimit: 60,
    passingPercentage: 70,
    price: 0,
    questionCategories: {},
    edition: 'NEC-2023' // Default to 2023 (most common use case)
  });

  // Reset form when dialog opens/closes or editing template changes
  useEffect(() => {
    if (editingTemplate) {
      setTemplateForm({
        title: editingTemplate.title,
        description: editingTemplate.description,
        questionCount: editingTemplate.questionCount ?? 10,
        timeLimit: editingTemplate.timeLimit ?? 60,
        passingPercentage: editingTemplate.passingPercentage ?? 70,
        price: editingTemplate.price ?? 0,
        questionCategories: editingTemplate.questionCategories || {},
        edition: editingTemplate.edition || 'NEC-2023'
      });
    } else {
      setTemplateForm({
        title: '',
        description: '',
        questionCount: 10,
        timeLimit: 60,
        passingPercentage: 70,
        price: 0,
        questionCategories: {},
        edition: 'NEC-2023'
      });
    }
  }, [isOpen, editingTemplate]);

  const handleSave = () => {
    if (templateForm.title.trim()) {
      onSave(templateForm);
      onClose();
    }
  };

  const handleClose = () => {
    setTemplateForm({
      title: "",
      description: "",
      questionCount: 10,
      timeLimit: 60,
      passingPercentage: 70,
      price: 0,
      questionCategories: {},
      edition: 'NEC-2023'
    });
    onClose();
  };

  const updateQuestionCategoryCount = (category: string, count: number) => {
    setTemplateForm(prev => ({
      ...prev,
      questionCategories: {
        ...(prev.questionCategories || {}),
        [category]: Math.max(0, count)
      }
    }));
  };

  const removeQuestionCategory = (category: string) => {
    setTemplateForm(prev => {
      const newQuestionCategories = { ...(prev.questionCategories || {}) };
      delete newQuestionCategories[category];
      return {
        ...prev,
        questionCategories: newQuestionCategories
      };
    });
  };

  // Sort categories using natural/alphanumeric sorting
  const sortCategories = (categories: string[]) => {
    return [...categories].sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  const availableQuestionCategories = sortCategories(
    questionCategories.filter(
      cat => !Object.keys(templateForm.questionCategories || {}).includes(cat)
    )
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingTemplate ? "Edit" : "Create"} Exam Template
          </DialogTitle>
          <DialogDescription>
            Configure the exam template settings and question distribution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={templateForm.title}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter exam title"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={templateForm.description}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter exam description"
                rows={3}
              />
            </div>

            {/* NEW: NEC Edition Selector */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="edition">NEC Edition *</Label>
                <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <Select
                value={templateForm.edition}
                onValueChange={(value: NecEdition) => setTemplateForm(prev => ({ ...prev, edition: value }))}
              >
                <SelectTrigger id="edition">
                  <SelectValue placeholder="Select NEC edition" />
                </SelectTrigger>
                <SelectContent>
                  {NEC_EDITIONS.map((edition) => (
                    <SelectItem key={edition} value={edition}>
                      {edition.replace('NEC-', 'NEC ')} Edition
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This exam will only include questions valid for the selected NEC edition
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="questionCount">Question Count</Label>
                <Input
                  id="questionCount"
                  type="number"
                  min="1"
                  value={templateForm.questionCount}
                  onChange={(e) => setTemplateForm(prev => ({ 
                    ...prev, 
                    questionCount: parseInt(e.target.value) || 1 
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  min="1"
                  value={templateForm.timeLimit}
                  onChange={(e) => setTemplateForm(prev => ({ 
                    ...prev, 
                    timeLimit: parseInt(e.target.value) || 1 
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="passingPercentage">Passing Percentage (%)</Label>
                <Input
                  id="passingPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={templateForm.passingPercentage ?? 70}
                  onChange={(e) => setTemplateForm(prev => ({ 
                    ...prev, 
                    passingPercentage: Math.min(100, Math.max(0, parseInt(e.target.value) || 70))
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum score required to pass (default: 70%)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={templateForm.price ?? 0}
                  onChange={(e) => setTemplateForm(prev => ({ 
                    ...prev, 
                    price: Math.max(0, parseFloat(e.target.value) || 0)
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  Set to 0 for free exams
                </p>
              </div>
            </div>
          </div>

          {/* Question Categories */}
          <div className="space-y-3">
            <Label>Question Categories (Optional - specify questions per category)</Label>
            <div className="space-y-2">
              {Object.entries(templateForm.questionCategories || {}).map(([category, count]) => (
                <div key={category} className="flex items-center gap-2">
                  <Badge variant="outline" className="flex-shrink-0">{category}</Badge>
                  <Input
                    type="number"
                    min="0"
                    value={count}
                    onChange={(e) => updateQuestionCategoryCount(category, parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">questions</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestionCategory(category)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            {availableQuestionCategories.length > 0 && (
              <Select onValueChange={(cat) => updateQuestionCategoryCount(cat, 1)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Add question category constraint" />
                </SelectTrigger>
                <SelectContent>
                  {availableQuestionCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!templateForm.title.trim()}
          >
            {editingTemplate ? "Save Changes" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};