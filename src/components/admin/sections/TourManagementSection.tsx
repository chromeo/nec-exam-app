import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Badge } from '../../ui/badge';
import { Switch } from '../../ui/switch';
import { Separator } from '../../ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../ui/alert-dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Save, 
  RotateCcw, 
  ArrowUp, 
  ArrowDown, 
  Eye,
  Settings,
  Upload,
  Download,
  Copy
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { AdminSectionHeader } from '../AdminSectionHeader';

// Tour step interface matching our current system
interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  allowClickThrough?: boolean;
  order: number;
  isActive: boolean;
}

// Tour configuration interface
interface TourConfig {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  showForNewExams: boolean;
  showPreDialog: boolean;
  preDialogTitle: string;
  preDialogDescription: string;
  steps: TourStep[];
  createdAt: string;
  updatedAt: string;
}

interface TourManagementSectionProps {
  accessToken: string;
}

const defaultTourStep: Omit<TourStep, 'id' | 'order'> = {
  title: '',
  description: '',
  targetSelector: '',
  position: 'bottom',
  allowClickThrough: false,
  isActive: true
};

const defaultTourConfig: Omit<TourConfig, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'New Tour',
  description: 'A new guided tour',
  isDefault: false,
  showForNewExams: true,
  showPreDialog: true,
  preDialogTitle: 'Welcome to Your Exam',
  preDialogDescription: 'Would you like a quick guided tour of the exam interface before you begin?',
  steps: []
};

export const TourManagementSection: React.FC<TourManagementSectionProps> = ({ accessToken }) => {
  const [tours, setTours] = useState<TourConfig[]>([]);
  const [selectedTour, setSelectedTour] = useState<TourConfig | null>(null);
  const [editingStep, setEditingStep] = useState<TourStep | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'tour' | 'step'; id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [stepFormData, setStepFormData] = useState<Omit<TourStep, 'id' | 'order'>>(defaultTourStep);

  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a9be5165${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }, [accessToken]);

  const loadTours = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiCall('/admin/tours');
      setTours(data.tours || []);
    } catch (error) {
      console.error('Failed to load tours:', error);
      toast.error('Failed to load tours');
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => {
    loadTours();
  }, [loadTours]);

  const handleCreateTour = async (tourData: Omit<TourConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      const result = await apiCall('/admin/tours', {
        method: 'POST',
        body: JSON.stringify(tourData)
      });
      
      await loadTours();
      setIsCreateDialogOpen(false);
      toast.success('Tour created successfully');
    } catch (error) {
      console.error('Failed to create tour:', error);
      toast.error('Failed to create tour');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTour = async (tourId: string, updates: Partial<TourConfig>) => {
    try {
      setLoading(true);
      await apiCall(`/admin/tours/${tourId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      
      await loadTours();
      if (selectedTour?.id === tourId) {
        setSelectedTour({ ...selectedTour, ...updates });
      }
      toast.success('Tour updated successfully');
    } catch (error) {
      console.error('Failed to update tour:', error);
      toast.error('Failed to update tour');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTour = async (tourId: string) => {
    try {
      setLoading(true);
      await apiCall(`/admin/tours/${tourId}`, { method: 'DELETE' });
      
      await loadTours();
      if (selectedTour?.id === tourId) {
        setSelectedTour(null);
      }
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      toast.success('Tour deleted successfully');
    } catch (error) {
      console.error('Failed to delete tour:', error);
      toast.error('Failed to delete tour');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStep = async () => {
    if (!selectedTour) return;
    
    try {
      setLoading(true);
      const newStep: TourStep = {
        ...stepFormData,
        id: `step-${Date.now()}`,
        order: selectedTour.steps.length
      };

      const updatedSteps = [...selectedTour.steps, newStep];
      await handleUpdateTour(selectedTour.id, { steps: updatedSteps });
      
      setIsStepDialogOpen(false);
      setStepFormData(defaultTourStep);
      toast.success('Tour step created successfully');
    } catch (error) {
      console.error('Failed to create step:', error);
      toast.error('Failed to create step');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStep = async () => {
    if (!selectedTour || !editingStep) return;
    
    try {
      setLoading(true);
      const updatedSteps = selectedTour.steps.map(step =>
        step.id === editingStep.id ? { ...stepFormData, id: editingStep.id, order: editingStep.order } : step
      );

      await handleUpdateTour(selectedTour.id, { steps: updatedSteps });
      
      setIsStepDialogOpen(false);
      setEditingStep(null);
      setStepFormData(defaultTourStep);
      toast.success('Tour step updated successfully');
    } catch (error) {
      console.error('Failed to update step:', error);
      toast.error('Failed to update step');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!selectedTour) return;
    
    try {
      setLoading(true);
      const updatedSteps = selectedTour.steps
        .filter(step => step.id !== stepId)
        .map((step, index) => ({ ...step, order: index }));

      await handleUpdateTour(selectedTour.id, { steps: updatedSteps });
      
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      toast.success('Tour step deleted successfully');
    } catch (error) {
      console.error('Failed to delete step:', error);
      toast.error('Failed to delete step');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveStep = async (stepId: string, direction: 'up' | 'down') => {
    if (!selectedTour) return;
    
    const currentIndex = selectedTour.steps.findIndex(step => step.id === stepId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= selectedTour.steps.length) return;
    
    const updatedSteps = [...selectedTour.steps];
    [updatedSteps[currentIndex], updatedSteps[newIndex]] = [updatedSteps[newIndex], updatedSteps[currentIndex]];
    
    // Update order values
    updatedSteps.forEach((step, index) => {
      step.order = index;
    });

    await handleUpdateTour(selectedTour.id, { steps: updatedSteps });
  };

  const handleDuplicateStep = (step: TourStep) => {
    setStepFormData({
      title: `${step.title} (Copy)`,
      description: step.description,
      targetSelector: step.targetSelector,
      position: step.position,
      allowClickThrough: step.allowClickThrough || false,
      isActive: step.isActive
    });
    setEditingStep(null);
    setIsStepDialogOpen(true);
  };

  const handleExportTour = (tour: TourConfig) => {
    const dataStr = JSON.stringify(tour, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tour-${tour.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openStepDialog = (step?: TourStep) => {
    if (step) {
      setEditingStep(step);
      setStepFormData({
        title: step.title,
        description: step.description,
        targetSelector: step.targetSelector,
        position: step.position,
        allowClickThrough: step.allowClickThrough || false,
        isActive: step.isActive
      });
    } else {
      setEditingStep(null);
      setStepFormData(defaultTourStep);
    }
    setIsStepDialogOpen(true);
  };

  const openDeleteDialog = (type: 'tour' | 'step', id: string, name: string) => {
    setItemToDelete({ type, id, name });
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="p-6 pt-0 space-y-6">
      {/* Header */}
      <AdminSectionHeader
        title="Tour Management"
        description="Create and manage guided tours for the exam interface"
      >
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          disabled={loading}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Tour
        </Button>
      </AdminSectionHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tours List */}
        <div className="lg:col-span-1">
          <Card className="bg-card text-card-foreground border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tours ({tours.length})</CardTitle>
              <CardDescription className="text-sm">
                Select a tour to edit its steps and configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading && tours.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">Loading tours...</div>
              ) : tours.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No tours created yet
                </div>
              ) : (
                tours.map((tour) => (
                  <div
                    key={tour.id}
                    className={`p-3 rounded-md border cursor-pointer transition-colors ${
                      selectedTour?.id === tour.id
                        ? 'bg-primary/10 border-primary'
                        : 'bg-background border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedTour(tour)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{tour.name}</span>
                          {tour.isDefault && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {tour.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {tour.steps.length} steps
                          </Badge>
                          {tour.showForNewExams && (
                            <Badge variant="outline" className="text-xs">Auto-show</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportTour(tour);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog('tour', tour.id, tour.name);
                          }}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tour Details */}
        <div className="lg:col-span-2">
          {selectedTour ? (
            <div className="space-y-6">
              {/* Tour Configuration */}
              <Card className="bg-card text-card-foreground border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Tour Configuration</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // TODO: Implement tour preview
                        toast.info('Tour preview not yet implemented');
                      }}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Preview Tour
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tour-name">Tour Name</Label>
                      <Input
                        id="tour-name"
                        value={selectedTour.name}
                        onChange={(e) => setSelectedTour({ ...selectedTour, name: e.target.value })}
                        onBlur={() => handleUpdateTour(selectedTour.id, { name: selectedTour.name })}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is-default"
                        checked={selectedTour.isDefault}
                        onCheckedChange={(checked) => 
                          handleUpdateTour(selectedTour.id, { isDefault: checked })
                        }
                      />
                      <Label htmlFor="is-default">Default Tour</Label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="tour-description">Description</Label>
                    <Textarea
                      id="tour-description"
                      value={selectedTour.description}
                      onChange={(e) => setSelectedTour({ ...selectedTour, description: e.target.value })}
                      onBlur={() => handleUpdateTour(selectedTour.id, { description: selectedTour.description })}
                      className="mt-1"
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-for-new-exams"
                        checked={selectedTour.showForNewExams}
                        onCheckedChange={(checked) => 
                          handleUpdateTour(selectedTour.id, { showForNewExams: checked })
                        }
                      />
                      <Label htmlFor="show-for-new-exams">Show for new exams</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-pre-dialog"
                        checked={selectedTour.showPreDialog}
                        onCheckedChange={(checked) => 
                          handleUpdateTour(selectedTour.id, { showPreDialog: checked })
                        }
                      />
                      <Label htmlFor="show-pre-dialog">Show pre-dialog</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tour Steps */}
              <Card className="bg-card text-card-foreground border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Tour Steps ({selectedTour.steps.length})</CardTitle>
                    <Button
                      onClick={() => openStepDialog()}
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Step
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedTour.steps.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No steps created yet</p>
                      <p className="text-xs">Add your first tour step to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedTour.steps
                        .sort((a, b) => a.order - b.order)
                        .map((step, index) => (
                          <div
                            key={step.id}
                            className="flex items-center gap-3 p-3 border border-border rounded-md bg-background"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                                {index + 1}
                              </span>
                              <div className="flex flex-col gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMoveStep(step.id, 'up')}
                                  disabled={index === 0}
                                  className="h-4 w-4 p-0"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMoveStep(step.id, 'down')}
                                  disabled={index === selectedTour.steps.length - 1}
                                  className="h-4 w-4 p-0"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm truncate">{step.title}</h4>
                                <Badge variant="outline" className="text-xs">{step.position}</Badge>
                                {!step.isActive && (
                                  <Badge variant="secondary" className="text-xs">Disabled</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {step.description}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1 font-mono">
                                {step.targetSelector}
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDuplicateStep(step)}
                                className="h-8 w-8 p-0"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openStepDialog(step)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteDialog('step', step.id, step.title)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-card text-card-foreground border-border">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center text-muted-foreground">
                  <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Select a tour to view and edit its configuration</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Tour Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Tour</DialogTitle>
            <DialogDescription>
              Create a new guided tour for the exam interface
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-tour-name">Tour Name</Label>
              <Input
                id="new-tour-name"
                placeholder="e.g., Exam Interface Tour"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="new-tour-description">Description</Label>
              <Textarea
                id="new-tour-description"
                placeholder="A brief description of this tour"
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const nameInput = document.getElementById('new-tour-name') as HTMLInputElement;
                const descInput = document.getElementById('new-tour-description') as HTMLTextAreaElement;
                
                if (!nameInput.value.trim()) {
                  toast.error('Please enter a tour name');
                  return;
                }
                
                handleCreateTour({
                  ...defaultTourConfig,
                  name: nameInput.value.trim(),
                  description: descInput.value.trim() || defaultTourConfig.description
                });
              }}
              disabled={loading}
            >
              Create Tour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step Edit Dialog */}
      <Dialog open={isStepDialogOpen} onOpenChange={setIsStepDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingStep ? 'Edit Tour Step' : 'Create Tour Step'}
            </DialogTitle>
            <DialogDescription>
              Configure the tour step properties and behavior
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="step-title">Step Title</Label>
                <Input
                  id="step-title"
                  value={stepFormData.title}
                  onChange={(e) => setStepFormData({ ...stepFormData, title: e.target.value })}
                  placeholder="e.g., Question Area"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="step-position">Tooltip Position</Label>
                <Select
                  value={stepFormData.position}
                  onValueChange={(value: 'top' | 'bottom' | 'left' | 'right' | 'center') =>
                    setStepFormData({ ...stepFormData, position: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">Top</SelectItem>
                    <SelectItem value="bottom">Bottom</SelectItem>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="step-description">Description</Label>
              <Textarea
                id="step-description"
                value={stepFormData.description}
                onChange={(e) => setStepFormData({ ...stepFormData, description: e.target.value })}
                placeholder="Explain what this element does and how to use it"
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="step-selector">Target Selector</Label>
              <Input
                id="step-selector"
                value={stepFormData.targetSelector}
                onChange={(e) => setStepFormData({ ...stepFormData, targetSelector: e.target.value })}
                placeholder='[data-tour="element-id"]'
                className="mt-1 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                CSS selector for the element to highlight (e.g., [data-tour="question-pane"])
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="step-active"
                  checked={stepFormData.isActive}
                  onCheckedChange={(checked) => 
                    setStepFormData({ ...stepFormData, isActive: checked })
                  }
                />
                <Label htmlFor="step-active">Active</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="step-click-through"
                  checked={stepFormData.allowClickThrough}
                  onCheckedChange={(checked) => 
                    setStepFormData({ ...stepFormData, allowClickThrough: checked })
                  }
                />
                <Label htmlFor="step-click-through">Allow click-through</Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsStepDialogOpen(false);
                setEditingStep(null);
                setStepFormData(defaultTourStep);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingStep ? handleUpdateStep : handleCreateStep}
              disabled={loading || !stepFormData.title.trim() || !stepFormData.targetSelector.trim()}
            >
              {editingStep ? 'Update Step' : 'Create Step'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {itemToDelete?.type === 'tour' ? 'Tour' : 'Step'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"? 
              {itemToDelete?.type === 'tour' && ' All tour steps will also be deleted.'} 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (itemToDelete?.type === 'tour') {
                  handleDeleteTour(itemToDelete.id);
                } else if (itemToDelete?.type === 'step') {
                  handleDeleteStep(itemToDelete.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};