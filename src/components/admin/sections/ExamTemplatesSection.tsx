import { useState, useEffect } from "react";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Plus, Edit, Trash2, Clock, Hash, Tag, GripVertical, LayoutGrid, List, Copy, AlertTriangle, RefreshCw } from "lucide-react";
import { ExamTemplateDialog } from "../dialogs/ExamTemplateDialog";
import { AdminSectionHeader } from "../AdminSectionHeader";
import { useAdminApi } from "../../../hooks/useAdminApi";
import { toast } from "sonner@2.0.3";
import type { ExamTemplate, TemplateForm } from "../../../supabase/functions/server/types";
import { projectId } from '../../../utils/supabase/info';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ExamTemplatesSectionProps {
  accessToken: string;
}

export const ExamTemplatesSection = ({
  accessToken,
}: ExamTemplatesSectionProps) => {
  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [sortedTemplates, setSortedTemplates] = useState<ExamTemplate[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExamTemplate | null>(null);
  const [questionCategories, setQuestionCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const { 
    templatesApi, 
    questionCategoriesApi,
    isLoading, 
    makeRequest, 
    error
  } = useAdminApi(accessToken);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadTemplates();
    loadCategories();
  }, []);

  // Update sorted templates when templates change
  useEffect(() => {
    if (templates.length > 0) {
      // Filter out any templates with invalid IDs and log them
      const validTemplates = templates.filter(t => {
        if (!t.id || typeof t.id !== 'string') {
          console.error('❌ Invalid template ID found:', t);
          return false;
        }
        return true;
      });

      // Check for duplicate IDs
      const ids = validTemplates.map(t => t.id);
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
      if (duplicates.length > 0) {
        console.error('❌ Duplicate template IDs found:', duplicates);
      }

      // Sort by displayOrder if available, otherwise maintain original order
      const sorted = [...validTemplates].sort((a, b) => {
        const orderA = a.displayOrder ?? 999999;
        const orderB = b.displayOrder ?? 999999;
        return orderA - orderB;
      });
      setSortedTemplates(sorted);
    } else {
      setSortedTemplates([]);
    }
  }, [templates]);

  const loadTemplates = async () => {
    const result = await templatesApi.getAll();
    if (result.success && result.data) {
      setTemplates(result.data);
    }
  };

  const loadCategories = async () => {
    const questionCatsResult = await questionCategoriesApi.getAll();
    
    if (questionCatsResult.success && questionCatsResult.data) {
      setQuestionCategories(questionCatsResult.data);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setIsDialogOpen(true);
  };

  const handleEditTemplate = (template: ExamTemplate) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  const handleSaveTemplate = async (templateData: TemplateForm) => {
    let result;
    
    if (editingTemplate) {
      result = await templatesApi.update(editingTemplate.id, templateData);
    } else {
      result = await templatesApi.create(templateData);
    }

    if (result.success) {
      toast.success(`Exam template ${editingTemplate ? 'updated' : 'created'} successfully`);
      setEditingTemplate(null);
      setIsDialogOpen(false);
      loadTemplates();
    } else {
      toast.error(result.error || `Failed to ${editingTemplate ? 'update' : 'create'} exam template`);
    }
  };

  const handleDeleteTemplate = async (template: ExamTemplate) => {
    if (confirm(`Are you sure you want to delete "${template.title}"?`)) {
      const result = await templatesApi.delete(template.id);
      if (result.success) {
        toast.success("Template deleted successfully");
        loadTemplates();
      } else {
        toast.error(result.error || "Failed to delete template");
      }
    }
  };

  // Drag and drop functionality
  const handleDragStart = (event: DragStartEvent) => {
    console.log('🔵 Drag started:', event.active.id);
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('🔵 Drag ended:', { activeId: active.id, overId: over?.id });
    setActiveId(null);

    if (!over || active.id === over.id) {
      console.log('⚠️ Drag cancelled or dropped on same position');
      return;
    }

    const oldIndex = sortedTemplates.findIndex((template) => template.id === active.id);
    const newIndex = sortedTemplates.findIndex((template) => template.id === over.id);

    console.log('🔵 Indices:', { oldIndex, newIndex, totalTemplates: sortedTemplates.length });

    if (oldIndex === -1 || newIndex === -1) {
      console.error('❌ Invalid drag indices:', { oldIndex, newIndex, activeId: active.id, overId: over.id });
      toast.error('Failed to reorder: Invalid template positions');
      return;
    }

    if (oldIndex !== -1 && newIndex !== -1) {
      try {
        const newTemplates = arrayMove(sortedTemplates, oldIndex, newIndex);
        
        // Update displayOrder values
        const updatedTemplates = newTemplates.map((template, index) => ({
          ...template,
          displayOrder: index
        }));
        
        console.log('✅ New order calculated:', updatedTemplates.map(t => ({ id: t.id, order: t.displayOrder })));
        
        // Optimistically update local state immediately for smooth UX
        setSortedTemplates(updatedTemplates);
        setTemplates(updatedTemplates);
        
        // Update backend in background without blocking UI - use direct fetch to avoid global loading state
        const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165`;
        const response = await fetch(`${serverUrl}/admin/exam-templates/reorder`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templates: updatedTemplates.map(t => ({ id: t.id, display_order: t.displayOrder }))
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Server update successful');
          toast.success("Template order updated successfully");
        } else {
          console.error('❌ Server update failed:', result.error);
          // Revert on error
          toast.error("Failed to save template order");
          loadTemplates(); // Reload to get original order
        }
      } catch (error) {
        console.error('❌ Drag end error:', error);
        toast.error("Failed to save template order");
        loadTemplates(); // Reload to get original order
      }
    }
  };

  // Compact Card View Component
  const SortableCompactCard = ({ template }: { template: ExamTemplate }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: template.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`
          p-3 border rounded-lg bg-card transition-all duration-200
          ${isDragging ? 'opacity-30' : 'opacity-100 hover:shadow-md'}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded transition-colors flex-shrink-0 group"
              title="Drag to reorder"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{template.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {template.description}
                  </p>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    <span>{template.questionCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{template.timeLimit}m</span>
                  </div>
                </div>
                
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditTemplate(template)}
              className="flex items-center gap-1 hover:bg-muted"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteTemplate(template)}
              className="flex items-center gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Table Row Component
  const SortableTableRow = ({ template }: { template: ExamTemplate }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: template.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <tr
        ref={setNodeRef}
        style={style}
        className={`
          border-b transition-all duration-200 bg-card
          ${isDragging ? 'opacity-30' : 'opacity-100 hover:bg-muted/50'}
        `}
      >
        <td className="p-2 w-8">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded transition-colors group"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </td>
        <td className="p-2">
          <div>
            <div className="font-medium">{template.title}</div>
            <div className="text-sm text-muted-foreground truncate max-w-64">
              {template.description}
            </div>
          </div>
        </td>
        <td className="p-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <Hash className="h-3 w-3" />
            <span>{template.questionCount}</span>
          </div>
        </td>
        <td className="p-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{template.timeLimit}m</span>
          </div>
        </td>
        <td className="p-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditTemplate(template)}
              className="h-8 w-8 p-0 hover:bg-muted"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              tooltip="clone template"
              size="sm"
              onClick={() => handleCloneTemplate(template)}
              className="h-8 w-8 p-0 hover:bg-muted"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteTemplate(template)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  // Drag Overlay Component
  const DragOverlayComponent = () => {
    const activeTemplate = sortedTemplates.find(template => template.id === activeId);
    
    if (!activeTemplate) return null;

    return viewMode === 'table' ? (
      <div className="bg-card border rounded-lg shadow-xl p-3 rotate-3 scale-105 min-w-72">
        <div className="flex items-center gap-3">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{activeTemplate.title}</div>
            <div className="text-sm text-muted-foreground truncate">
              {activeTemplate.description}
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="bg-card border rounded-lg shadow-xl p-3 rotate-3 scale-105 min-w-96">
        <div className="flex items-center gap-3">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{activeTemplate.title}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {activeTemplate.description}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <div className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                <span>{activeTemplate.questionCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{activeTemplate.timeLimit}m</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleCloneTemplate = async (template: ExamTemplate) => {
    try {
      const result = await templatesApi.clone(template.id);
      if (result.success) {
        toast.success(`Template "${template.title}" cloned successfully`);
        loadTemplates();
      } else {
        toast.error(result.error || "Failed to clone template");
      }
    } catch (error) {
      console.error('Clone template error:', error);
      toast.error("Failed to clone template");
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-6 pt-0 space-y-6">
        {/* Header */}
        <AdminSectionHeader
          title="Exam Templates"
          description="Create and manage exam templates with different configurations"
        >
          {/* View Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="flex items-center gap-2 h-8"
            >
              <LayoutGrid className="h-4 w-4" />
              Cards
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="flex items-center gap-2 h-8"
            >
              <List className="h-4 w-4" />
              Table
            </Button>
          </div>
          
          <Button onClick={handleCreateTemplate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </AdminSectionHeader>

        {/* API Error Display */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive font-medium">Error:</span>
              <span className="text-sm text-destructive">{error}</span>
            </div>
          </div>
        )}

        {/* Templates List */}
        <Card>
          <CardHeader>
            <CardTitle>Templates List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading templates...</div>
            ) : sortedTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No exam templates found
              </div>
            ) : viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-2 w-8"></th>
                      <th className="p-2">Template</th>
                      <th className="p-2 text-center">Questions</th>
                      <th className="p-2 text-center">Time</th>
                      <th className="p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <SortableContext
                      items={sortedTemplates.map(template => template.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {sortedTemplates.map((template) => (
                        <SortableTableRow key={template.id} template={template} />
                      ))}
                    </SortableContext>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-3">
                <SortableContext
                  items={sortedTemplates.map(template => template.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedTemplates.map((template) => (
                    <SortableCompactCard key={template.id} template={template} />
                  ))}
                </SortableContext>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exam Template Dialog */}
        <ExamTemplateDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setEditingTemplate(null);
          }}
          onSave={handleSaveTemplate}
          editingTemplate={editingTemplate}
          questionCategories={questionCategories}
        />
      </div>
      
      {/* Drag Overlay */}
      <DragOverlay>
        <DragOverlayComponent />
      </DragOverlay>
    </DndContext>
  );
};