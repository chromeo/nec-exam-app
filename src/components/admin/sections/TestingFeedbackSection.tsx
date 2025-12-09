import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { ScrollArea } from "../../ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../ui/accordion";
import {
  BarChart3,
  Users,
  Calendar,
  CheckCircle,
  AlertTriangle,
  XCircle,
  MinusCircle,
  FileText,
  TrendingUp,
  Download,
  RefreshCw
} from "lucide-react";
import { useAdminApi } from "../../../hooks/useAdminApi";
import { toast } from "sonner@2.0.3";
import { AdminSectionHeader } from '../AdminSectionHeader';

type TestStatus = 'untested' | 'yes' | 'partial' | 'no';

interface ChecklistItem {
  id: string;
  text: string;
  priority?: '🔴' | '🟡' | '🟢';
  status: TestStatus;
  comment: string;
  testedDate?: string;
  testedOnVersion?: string; // Track which build version this item was tested on
}

interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItem[];
  notes: string;
}

interface ChecklistData {
  testerName: string;
  testDate: string;
  buildVersion: string;
  sections: ChecklistSection[];
}

interface TestingFeedback {
  id: string;
  version: string;
  testerName: string;
  submittedAt: string;
  data: ChecklistData;
}

interface ItemAnalytics {
  id: string;
  text: string;
  priority?: '🔴' | '🟡' | '🟢';
  totalResponses: number;
  yesCount: number;
  partialCount: number;
  noCount: number;
  untestedCount: number;
  yesPercentage: number;
  partialPercentage: number;
  noPercentage: number;
  comments: Array<{ tester: string; comment: string; version: string; testedOnVersion?: string }>;
}

export function TestingFeedbackSection({ accessToken }: { accessToken: string }) {
  const [feedbackList, setFeedbackList] = useState<TestingFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string | 'all'>('all');
  const { makeRequest } = useAdminApi(accessToken);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const data = await makeRequest('/testing-feedback', { method: 'GET' });
      if (data.success && data.data) {
        // Filter out malformed feedback (must have data.sections)
        const validFeedback = data.data.filter((f: TestingFeedback) => {
          const isValid = f.data && Array.isArray(f.data.sections);
          if (!isValid) {
            console.warn('Skipping malformed feedback entry:', f.id);
          }
          return isValid;
        });
        
        setFeedbackList(validFeedback);
        
        const skipped = data.data.length - validFeedback.length;
        if (skipped > 0) {
          toast.success(`Loaded ${validFeedback.length} feedback submissions (${skipped} invalid entries skipped)`);
        } else {
          toast.success(`Loaded ${validFeedback.length} feedback submissions`);
        }
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
      toast.error('Failed to load testing feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const versions = Array.from(new Set(feedbackList.map(f => f.version))).sort().reverse();
  
  const filteredFeedback = selectedVersion === 'all' 
    ? feedbackList 
    : feedbackList.filter(f => f.version === selectedVersion);

  // Aggregate analytics across all feedback
  const getItemAnalytics = (): Map<string, ItemAnalytics> => {
    const analyticsMap = new Map<string, ItemAnalytics>();

    filteredFeedback.forEach(feedback => {
      feedback.data.sections.forEach(section => {
        section.items.forEach(item => {
          const key = `${section.id}:${item.id}`;
          
          if (!analyticsMap.has(key)) {
            analyticsMap.set(key, {
              id: key,
              text: item.text,
              priority: item.priority,
              totalResponses: 0,
              yesCount: 0,
              partialCount: 0,
              noCount: 0,
              untestedCount: 0,
              yesPercentage: 0,
              partialPercentage: 0,
              noPercentage: 0,
              comments: [],
            });
          }

          const analytics = analyticsMap.get(key)!;
          analytics.totalResponses++;

          switch (item.status) {
            case 'yes':
              analytics.yesCount++;
              break;
            case 'partial':
              analytics.partialCount++;
              break;
            case 'no':
              analytics.noCount++;
              break;
            case 'untested':
              analytics.untestedCount++;
              break;
          }

          if (item.comment.trim()) {
            analytics.comments.push({
              tester: feedback.testerName,
              comment: item.comment,
              version: feedback.version,
              testedOnVersion: item.testedOnVersion,
            });
          }
        });
      });
    });

    // Calculate percentages
    analyticsMap.forEach(analytics => {
      const tested = analytics.totalResponses - analytics.untestedCount;
      if (tested > 0) {
        analytics.yesPercentage = Math.round((analytics.yesCount / tested) * 100);
        analytics.partialPercentage = Math.round((analytics.partialCount / tested) * 100);
        analytics.noPercentage = Math.round((analytics.noCount / tested) * 100);
      }
    });

    return analyticsMap;
  };

  const getSectionAnalytics = () => {
    const analyticsMap = getItemAnalytics();
    const sections = filteredFeedback[0]?.data?.sections || [];
    
    return sections.map(section => {
      const sectionItems = section.items.map(item => {
        const key = `${section.id}:${item.id}`;
        return analyticsMap.get(key);
      }).filter(Boolean) as ItemAnalytics[];

      return {
        id: section.id,
        title: section.title,
        items: sectionItems,
      };
    });
  };

  const getOverallStats = () => {
    const analyticsMap = getItemAnalytics();
    const allItems = Array.from(analyticsMap.values());
    
    const totalItems = allItems.length;
    const testedItems = allItems.filter(i => i.totalResponses - i.untestedCount > 0).length;
    const greenItems = allItems.filter(i => i.yesPercentage >= 80).length;
    const yellowItems = allItems.filter(i => i.yesPercentage >= 50 && i.yesPercentage < 80).length;
    const redItems = allItems.filter(i => i.yesPercentage < 50 && (i.totalResponses - i.untestedCount) > 0).length;

    return {
      totalSubmissions: filteredFeedback.length,
      totalItems,
      testedItems,
      greenItems,
      yellowItems,
      redItems,
      uniqueTesters: new Set(filteredFeedback.map(f => f.testerName)).size,
    };
  };

  const exportToCSV = () => {
    const analyticsMap = getItemAnalytics();
    const rows = [
      ['Item ID', 'Item Text', 'Priority', 'Total Responses', 'Yes %', 'Partial %', 'No %', 'Comments Count']
    ];

    analyticsMap.forEach(item => {
      rows.push([
        item.id,
        item.text,
        item.priority || '',
        item.totalResponses.toString(),
        item.yesPercentage.toString(),
        item.partialPercentage.toString(),
        item.noPercentage.toString(),
        item.comments.length.toString(),
      ]);
    });

    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `testing-feedback-${selectedVersion}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const stats = getOverallStats();
  const sectionAnalytics = getSectionAnalytics();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading testing feedback...</p>
        </div>
      </div>
    );
  }

  if (feedbackList.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Testing Feedback Yet</h3>
          <p className="text-muted-foreground mb-4">
            Testing feedback will appear here once users submit the testing checklist.
          </p>
          <Button variant="outline" size="sm" onClick={loadFeedback} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-0 space-y-6">
      {/* Header */}
      <AdminSectionHeader
        title="Testing Feedback & Analytics"
        description="View and analyze tester feedback with visual insights"
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Submissions</p>
                <p className="text-2xl font-semibold text-foreground">{stats.totalSubmissions}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unique Testers</p>
                <p className="text-2xl font-semibold text-foreground">{stats.uniqueTesters}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Items Tested</p>
                <p className="text-2xl font-semibold text-foreground">{stats.testedItems} / {stats.totalItems}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">Status Distribution</p>
                <div className="flex gap-2">
                  <Badge className="bg-green-500 hover:bg-green-600">{stats.greenItems}</Badge>
                  <Badge className="bg-yellow-500 hover:bg-yellow-600">{stats.yellowItems}</Badge>
                  <Badge className="bg-red-500 hover:bg-red-600">{stats.redItems}</Badge>
                </div>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Version Filter:</label>
                <select
                  value={selectedVersion}
                  onChange={(e) => setSelectedVersion(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="all">All Versions</option>
                  {versions.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <Badge variant="secondary">
                {filteredFeedback.length} submission{filteredFeedback.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadFeedback} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sections">By Section</TabsTrigger>
          <TabsTrigger value="submissions">Raw Submissions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Items Requiring Attention</CardTitle>
              <CardDescription>Items with less than 50% success rate or multiple &quot;No&quot; responses</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {Array.from(getItemAnalytics().values())
                    .filter(item => {
                      const tested = item.totalResponses - item.untestedCount;
                      return tested > 0 && (item.yesPercentage < 50 || item.noCount >= 2);
                    })
                    .sort((a, b) => a.noPercentage - b.noPercentage)
                    .map(item => (
                      <Card key={item.id} className="border-red-500/50 bg-red-500/5">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            {/* Item Header */}
                            <div className="flex items-start gap-3">
                              {item.priority && (
                                <Badge variant="secondary">{item.priority}</Badge>
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-foreground">{item.text}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.totalResponses - item.untestedCount} response(s)
                                </p>
                              </div>
                            </div>

                            {/* Response Summary */}
                            <div className="flex items-center gap-4 text-sm">
                              {item.yesCount > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span className="text-green-600 font-medium">{item.yesCount} Yes</span>
                                </div>
                              )}
                              {item.partialCount > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <MinusCircle className="h-4 w-4 text-yellow-500" />
                                  <span className="text-yellow-600 font-medium">{item.partialCount} Partial</span>
                                </div>
                              )}
                              {item.noCount > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <XCircle className="h-4 w-4 text-red-500" />
                                  <span className="text-red-600 font-medium">{item.noCount} No</span>
                                </div>
                              )}
                            </div>

                            {/* Comments */}
                            {item.comments.length > 0 && (
                              <div className="pt-2 border-t space-y-2">
                                <p className="text-sm font-medium">Comments ({item.comments.length}):</p>
                                {item.comments.map((c, idx) => (
                                  <div key={idx} className="pl-4 border-l-2 border-muted">
                                    <p className="text-sm text-foreground">{c.comment}</p>
                                    <p className="text-xs text-muted-foreground">
                                      — {c.tester} • Tested on: {c.testedOnVersion || c.version}
                                      {c.testedOnVersion && c.testedOnVersion !== c.version && (
                                        <span className="text-yellow-600"> (submitted with {c.version})</span>
                                      )}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  {Array.from(getItemAnalytics().values()).filter(item => {
                    const tested = item.totalResponses - item.untestedCount;
                    return tested > 0 && (item.yesPercentage < 50 || item.noCount >= 2);
                  }).length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p>No critical issues found! All items have greater than 50% success rate.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sections Tab */}
        <TabsContent value="sections" className="space-y-4">
          <Accordion type="single" collapsible className="space-y-4">
            {sectionAnalytics.map(section => {
              const sectionYesAvg = Math.round(
                section.items.reduce((sum, i) => sum + i.yesPercentage, 0) / section.items.length
              );
              return (
                <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-medium">{section.title}</span>
                      <div className="flex items-center gap-4">
                        <Badge
                          className={
                            sectionYesAvg >= 80
                              ? 'bg-green-500'
                              : sectionYesAvg >= 50
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }
                        >
                          {sectionYesAvg}% Success
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {section.items.length} items
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="space-y-3">
                      {section.items.map(item => {
                        const tested = item.totalResponses - item.untestedCount;
                        if (tested === 0) return null;

                        return (
                          <div key={item.id} className="p-4 rounded-lg border border-border bg-card">
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                {item.priority && (
                                  <Badge variant="secondary" className="mt-0.5">{item.priority}</Badge>
                                )}
                                <div className="flex-1">
                                  <p className="text-sm text-foreground">{item.text}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {tested} response(s)
                                  </p>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="w-full h-6 bg-muted rounded-full overflow-hidden flex">
                                <div
                                  className="bg-green-500 flex items-center justify-center text-white text-xs"
                                  style={{ width: `${item.yesPercentage}%` }}
                                >
                                  {item.yesPercentage > 10 && `${item.yesPercentage}%`}
                                </div>
                                <div
                                  className="bg-yellow-500 flex items-center justify-center text-white text-xs"
                                  style={{ width: `${item.partialPercentage}%` }}
                                >
                                  {item.partialPercentage > 10 && `${item.partialPercentage}%`}
                                </div>
                                <div
                                  className="bg-red-500 flex items-center justify-center text-white text-xs"
                                  style={{ width: `${item.noPercentage}%` }}
                                >
                                  {item.noPercentage > 10 && `${item.noPercentage}%`}
                                </div>
                              </div>

                              {item.comments.length > 0 && (
                                <details className="text-sm">
                                  <summary className="cursor-pointer text-primary">
                                    View {item.comments.length} comment(s)
                                  </summary>
                                  <div className="mt-2 space-y-2">
                                    {item.comments.map((c, idx) => (
                                      <div key={idx} className="pl-4 border-l-2 border-muted">
                                        <p className="text-foreground">{c.comment}</p>
                                        <p className="text-xs text-muted-foreground">
                                          — {c.tester} ({c.version})
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </TabsContent>

        {/* Raw Submissions Tab */}
        <TabsContent value="submissions" className="space-y-4">
          <ScrollArea className="h-[700px]">
            <div className="space-y-4">
              {filteredFeedback.map(feedback => (
                <Card key={feedback.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {feedback.testerName}
                        </CardTitle>
                        <CardDescription>
                          Version: {feedback.version} • Submitted: {new Date(feedback.submittedAt).toLocaleString()}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {feedback.data?.sections?.reduce(
                          (sum, s) => sum + s.items.filter(i => i.status !== 'untested').length,
                          0
                        ) || 0} items tested
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <details className="cursor-pointer">
                      <summary className="text-sm font-medium text-primary">View Full Submission</summary>
                      <pre className="mt-4 p-4 bg-muted rounded-lg text-xs overflow-auto">
                        {JSON.stringify(feedback.data, null, 2)}
                      </pre>
                    </details>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}