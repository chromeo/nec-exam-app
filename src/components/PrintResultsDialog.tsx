import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "./ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import {
  Printer,
  Filter,
  Calendar,
  Award,
  TrendingUp,
  Clock,
  FileText,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface ExamResult {
  id: string;
  examId: string;
  templateId: string;
  templateTitle: string;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  score: number;
  percentage: number;
  submittedAt: string;
  completedAt: string;
}

interface ExamTemplate {
  id: string;
  title: string;
  category?: string;
}

interface PrintResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userProfile: {
    name: string;
    email: string;
  };
  accessToken: string;
}

export function PrintResultsDialog({
  open,
  onOpenChange,
  userId,
  userProfile,
  accessToken,
}: PrintResultsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  
  // Filter state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("all");
  
  // Filtered results
  const [filteredResults, setFilteredResults] = useState<ExamResult[]>([]);
  
  // Summary statistics
  const [stats, setStats] = useState({
    totalExams: 0,
    averageScore: 0,
    passRate: 0,
    totalTime: 0,
    highestScore: 0,
    lowestScore: 0,
  });

  // Fetch exam history
  useEffect(() => {
    if (open) {
      fetchExamHistory();
      fetchTemplates();
    }
  }, [open, userId]);

  // Apply filters whenever filter state changes
  useEffect(() => {
    applyFilters();
  }, [results, dateFrom, dateTo, selectedTemplate]);

  const fetchExamHistory = async () => {
    setLoading(true);
    try {
      // Use user-facing endpoint - user ID is extracted from the access token on server
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165/user/exam-history`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch exam history");
      }

      const data = await response.json();
      if (data.success) {
        setResults(data.results || []);
      } else {
        throw new Error(data.error || "Failed to fetch exam history");
      }
    } catch (error) {
      console.error("Error fetching exam history:", error);
      toast.error("Failed to Load", {
        description: "Could not load exam history. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165/exam-templates`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }

      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...results];

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(
        (result) => new Date(result.completedAt) >= fromDate
      );
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // Include entire end date
      filtered = filtered.filter(
        (result) => new Date(result.completedAt) <= toDate
      );
    }

    // Template filter
    if (selectedTemplate && selectedTemplate !== "all") {
      filtered = filtered.filter(
        (result) => result.templateId === selectedTemplate
      );
    }

    setFilteredResults(filtered);

    // Calculate summary statistics
    if (filtered.length > 0) {
      const totalExams = filtered.length;
      const averageScore =
        filtered.reduce((sum, r) => sum + r.percentage, 0) / totalExams;
      const passRate =
        (filtered.filter((r) => r.percentage >= 70).length / totalExams) * 100;
      const highestScore = Math.max(...filtered.map((r) => r.percentage));
      const lowestScore = Math.min(...filtered.map((r) => r.percentage));

      setStats({
        totalExams,
        averageScore: Math.round(averageScore * 10) / 10,
        passRate: Math.round(passRate * 10) / 10,
        totalTime: 0, // Not available in current data structure
        highestScore: Math.round(highestScore * 10) / 10,
        lowestScore: Math.round(lowestScore * 10) / 10,
      });
    } else {
      setStats({
        totalExams: 0,
        averageScore: 0,
        passRate: 0,
        totalTime: 0,
        highestScore: 0,
        lowestScore: 0,
      });
    }
  };

  const handleGeneratePrint = () => {
    if (filteredResults.length === 0) {
      toast.error("No Results", {
        description: "No exam results match your filters.",
      });
      return;
    }

    // Create a print-friendly window
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup Blocked", {
        description: "Please allow popups to print results.",
      });
      return;
    }

    // Format dates for display
    const dateRangeText = dateFrom || dateTo 
      ? `${dateFrom ? new Date(dateFrom).toLocaleDateString() : 'Beginning'} - ${dateTo ? new Date(dateTo).toLocaleDateString() : 'Present'}`
      : 'All Time';

    const templateText = selectedTemplate && selectedTemplate !== 'all'
      ? templates.find(t => t.id === selectedTemplate)?.title || 'All Exams'
      : 'All Exams';

    // Generate result rows HTML
    const resultsHTML = filteredResults
      .map(
        (result, index) => `
      <div class="result-item">
        <div class="result-header">
          <div>
            <div class="result-number">#${index + 1}</div>
            <div class="result-title">${result.templateTitle}</div>
          </div>
          <div class="result-score ${result.percentage >= 70 ? 'pass' : 'fail'}">
            ${result.percentage.toFixed(1)}%
          </div>
        </div>
        <div class="result-details">
          <span><strong>Date:</strong> ${new Date(result.completedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</span>
          <span><strong>Questions:</strong> ${result.answeredQuestions}/${result.totalQuestions}</span>
          <span><strong>Correct:</strong> ${result.correctAnswers}</span>
          <span><strong>Status:</strong> <span class="status-badge ${result.percentage >= 70 ? 'pass' : 'fail'}">${result.percentage >= 70 ? 'PASS' : 'FAIL'}</span></span>
        </div>
      </div>
    `
      )
      .join("");

    // Generate print-friendly HTML
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Exam Results Report - ${userProfile.name}</title>
        <style>
          @media print {
            @page { 
              margin: 0.5in; 
              size: letter;
            }
            body { margin: 0; }
            .no-print { display: none; }
          }
          
          * {
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 20px;
            color: #000;
            background: #fff;
            line-height: 1.5;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #000;
          }
          
          .header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 600;
          }
          
          .header .user-info {
            margin: 10px 0;
            font-size: 16px;
          }
          
          .header .user-info strong {
            font-weight: 600;
          }
          
          .header .meta {
            margin: 8px 0;
            color: #666;
            font-size: 14px;
          }
          
          .filters-summary {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 25px;
            border-left: 4px solid #2563eb;
          }
          
          .filters-summary h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            color: #666;
          }
          
          .filter-item {
            display: inline-block;
            margin-right: 20px;
            font-size: 14px;
          }
          
          .filter-item strong {
            color: #000;
          }
          
          .statistics {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          
          .stat-card {
            background: #fff;
            border: 2px solid #e5e7eb;
            border-radius: 6px;
            padding: 15px;
            text-align: center;
          }
          
          .stat-value {
            font-size: 32px;
            font-weight: 700;
            color: #2563eb;
            margin: 5px 0;
          }
          
          .stat-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
          }
          
          .section {
            margin-bottom: 30px;
          }
          
          .section h2 {
            font-size: 20px;
            margin-bottom: 20px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
            font-weight: 600;
          }
          
          .result-item {
            padding: 15px;
            margin-bottom: 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            page-break-inside: avoid;
            background: #fff;
          }
          
          .result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          
          .result-number {
            display: inline-block;
            background: #f3f4f6;
            color: #6b7280;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 4px;
          }
          
          .result-title {
            font-weight: 600;
            font-size: 16px;
            color: #000;
          }
          
          .result-score {
            font-size: 24px;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 6px;
          }
          
          .result-score.pass {
            background: #d1fae5;
            color: #065f46;
          }
          
          .result-score.fail {
            background: #fee2e2;
            color: #991b1b;
          }
          
          .result-details {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            color: #4b5563;
            font-size: 13px;
          }
          
          .result-details span {
            white-space: nowrap;
          }
          
          .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          
          .status-badge.pass {
            background: #d1fae5;
            color: #065f46;
          }
          
          .status-badge.fail {
            background: #fee2e2;
            color: #991b1b;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
          }
          
          .footer p {
            margin: 5px 0;
            color: #6b7280;
            font-size: 12px;
          }
          
          .print-instructions {
            background: #fffbeb;
            border: 2px solid #fbbf24;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 20px;
          }
          
          .print-instructions h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            font-weight: 600;
            color: #92400e;
          }
          
          .print-instructions p {
            margin: 5px 0;
            font-size: 13px;
            color: #78350f;
          }
          
          @media print {
            .print-instructions {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-instructions no-print">
          <h3>📄 How to Save as PDF</h3>
          <p><strong>Windows:</strong> Press Ctrl+P → Select "Save as PDF" as printer → Click Save</p>
          <p><strong>Mac:</strong> Press Cmd+P → Click "PDF" dropdown in bottom-left → Select "Save as PDF"</p>
        </div>
        
        <div class="header">
          <h1>Exam Results Report</h1>
          <div class="user-info">
            <strong>${userProfile.name}</strong> • ${userProfile.email}
          </div>
          <div class="meta">
            Generated: ${new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>

        <div class="filters-summary">
          <h3>Report Filters</h3>
          <div class="filter-item">
            <strong>Date Range:</strong> ${dateRangeText}
          </div>
          <div class="filter-item">
            <strong>Exam:</strong> ${templateText}
          </div>
          <div class="filter-item">
            <strong>Results:</strong> ${filteredResults.length} exam${filteredResults.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div class="statistics">
          <div class="stat-card">
            <div class="stat-label">Total Exams</div>
            <div class="stat-value">${stats.totalExams}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Average Score</div>
            <div class="stat-value">${stats.averageScore.toFixed(1)}%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Pass Rate</div>
            <div class="stat-value">${stats.passRate.toFixed(1)}%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Highest Score</div>
            <div class="stat-value">${stats.highestScore.toFixed(1)}%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Lowest Score</div>
            <div class="stat-value">${stats.lowestScore.toFixed(1)}%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Exams Passed</div>
            <div class="stat-value">${filteredResults.filter(r => r.percentage >= 70).length}</div>
          </div>
        </div>

        <div class="section">
          <h2>Detailed Results</h2>
          ${resultsHTML || '<p style="color: #6b7280; font-style: italic;">No results to display.</p>'}
        </div>

        <div class="footer">
          <p><strong>Official Exam Results Report</strong></p>
          <p>This document contains ${filteredResults.length} exam result${filteredResults.length !== 1 ? 's' : ''} matching the specified filters.</p>
          <p>For questions or verification, please contact support.</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for content to load, then trigger print
    printWindow.onload = () => {
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };

    toast.success("Print Ready", {
      description: "Print dialog opened. Use the browser's print dialog to save as PDF.",
    });
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedTemplate("all");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Print Exam Results
          </DialogTitle>
          <DialogDescription>
            Filter your exam history and generate a comprehensive print report with summary statistics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filters Section */}
          <Card className="bg-background border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </CardTitle>
              <CardDescription>
                Customize which results to include in your report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date-from" className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    From Date
                  </Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-input-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date-to" className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    To Date
                  </Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-input-background border-border"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="exam-template" className="flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  Exam Template
                </Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger id="exam-template" className="bg-input-background border-border">
                    <SelectValue placeholder="Select exam template" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">All Exams</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="flex-1 border-border"
                >
                  Clear Filters
                </Button>
                <Badge variant="secondary" className="px-3 py-2">
                  {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Summary Statistics */}
          {loading ? (
            <Card className="bg-background border-border">
              <CardContent className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading exam history...</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredResults.length > 0 ? (
            <>
              <Card className="bg-background border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Summary Statistics
                  </CardTitle>
                  <CardDescription>
                    Overview of filtered exam results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg border border-border">
                      <Award className="w-5 h-5 mb-2 text-primary" />
                      <div className="text-3xl text-primary">{stats.totalExams}</div>
                      <div className="text-muted-foreground">Total Exams</div>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg border border-border">
                      <TrendingUp className="w-5 h-5 mb-2 text-chart-2" />
                      <div className="text-3xl text-chart-2">{stats.averageScore.toFixed(1)}%</div>
                      <div className="text-muted-foreground">Avg Score</div>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg border border-border">
                      <Award className="w-5 h-5 mb-2 text-chart-4" />
                      <div className="text-3xl text-chart-4">{stats.passRate.toFixed(1)}%</div>
                      <div className="text-muted-foreground">Pass Rate</div>
                    </div>
                  </div>
                  <Separator className="my-4 bg-border" />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-xl text-foreground">{stats.highestScore.toFixed(1)}%</div>
                      <div className="text-muted-foreground">Highest</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl text-foreground">{stats.lowestScore.toFixed(1)}%</div>
                      <div className="text-muted-foreground">Lowest</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl text-foreground">
                        {filteredResults.filter(r => r.percentage >= 70).length}
                      </div>
                      <div className="text-muted-foreground">Passed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card className="bg-background border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Results Preview
                  </CardTitle>
                  <CardDescription>
                    Showing {Math.min(5, filteredResults.length)} of {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-enhanced">
                    {filteredResults.slice(0, 5).map((result, index) => (
                      <div
                        key={result.id}
                        className="p-3 bg-muted/30 rounded-lg border border-border"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <Badge variant="secondary" className="text-xs mb-1">
                              #{index + 1}
                            </Badge>
                            <div className="text-foreground">{result.templateTitle}</div>
                          </div>
                          <div className={`text-xl ${result.percentage >= 70 ? 'text-chart-2' : 'text-destructive'}`}>
                            {result.percentage.toFixed(1)}%
                          </div>
                        </div>
                        <div className="flex gap-4 text-muted-foreground">
                          <span>{new Date(result.completedAt).toLocaleDateString()}</span>
                          <span>{result.correctAnswers}/{result.totalQuestions}</span>
                          <Badge
                            variant={result.percentage >= 70 ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {result.percentage >= 70 ? "PASS" : "FAIL"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  {filteredResults.length > 5 && (
                    <p className="text-muted-foreground text-center mt-3">
                      + {filteredResults.length - 5} more result{filteredResults.length - 5 !== 1 ? 's' : ''} will be included in the print
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-background border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-foreground">No exam results found</p>
                <p className="text-muted-foreground">
                  Try adjusting your filters or take some exams first.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGeneratePrint}
              disabled={loading || filteredResults.length === 0}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Print
                </>
              )}
            </Button>
          </div>

          {/* PDF Instructions */}
          <Card className="bg-accent/20 border-accent">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Printer className="w-5 h-5 text-accent-foreground flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-accent-foreground">
                    <strong>How to Save as PDF:</strong>
                  </p>
                  <p className="text-muted-foreground">
                    <strong>Windows:</strong> Press Ctrl+P → Select "Save as PDF" as printer → Click Save
                  </p>
                  <p className="text-muted-foreground">
                    <strong>Mac:</strong> Press Cmd+P → Click "PDF" dropdown in bottom-left → Select "Save as PDF"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
