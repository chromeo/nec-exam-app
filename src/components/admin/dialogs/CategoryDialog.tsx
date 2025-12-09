import { useState, useEffect } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "../../ui/dialog";

interface CategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (oldName: string, newName: string) => void;
  editingCategory: string | null;
  categoryType: "exam" | "question";
}

export const CategoryDialog = ({
  isOpen,
  onClose,
  onSave,
  editingCategory,
  categoryType,
}: CategoryDialogProps) => {
  const [categoryName, setCategoryName] = useState("");

  // Reset form when dialog opens/closes or editing category changes
  useEffect(() => {
    if (isOpen && editingCategory) {
      setCategoryName(editingCategory);
    } else if (!isOpen) {
      setCategoryName("");
    }
  }, [isOpen, editingCategory]);

  const handleSave = () => {
    if (categoryName.trim() && editingCategory) {
      onSave(editingCategory, categoryName.trim());
      onClose();
    }
  };

  const handleClose = () => {
    setCategoryName("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit {categoryType === "exam" ? "Exam" : "Question"} Category
          </DialogTitle>
          <DialogDescription>
            Update the name of this {categoryType} category.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="categoryName">Category Name</Label>
            <Input
              id="categoryName"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Enter category name"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!categoryName.trim() || categoryName.trim() === editingCategory}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};