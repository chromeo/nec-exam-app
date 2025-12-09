import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  BarChart3,
  FileQuestion, 
  FolderOpen, 
  Tags, 
  FileText, 
  ChartBar, 
  Settings, 
  ArrowLeft,
  Menu,
  X,
  Users,
  Database,
  Bug,
  Package,
  Upload,
  BookOpen,
  MessageSquare,
  FileSearch,
  Route,
  ClipboardCheck,
  Clock,
  Network
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { AdminSection } from "./types";

interface AdminSidebarProps {
  currentSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  onExitAdmin: () => void;
  questionsCount?: number;
  templatesCount?: number;
  resultsCount?: number;
  questionCategoriesCount?: number;
  usersCount?: number;
  commentsCount?: number;
  sessionsCount?: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const AdminSidebar = ({
  currentSection,
  onSectionChange,
  onExitAdmin,
  questionsCount = 0,
  templatesCount = 0,
  resultsCount = 0,
  questionCategoriesCount = 0,
  usersCount = 0,
  commentsCount = 0,
  sessionsCount = 0,
  isCollapsed,
  onToggleCollapse,
}: AdminSidebarProps) => {
  const sidebarItems = [
    {
      id: 'dashboard' as AdminSection,
      label: 'Dashboard',
      icon: BarChart3,
      count: 0,
    },
    {
      id: 'questions' as AdminSection,
      label: 'Questions',
      icon: FileQuestion,
      count: questionsCount,
    },
    {
      id: 'question-categories' as AdminSection,
      label: 'Question Categories',
      icon: Tags,
      count: questionCategoriesCount,
    },
    {
      id: 'exam-templates' as AdminSection,
      label: 'Exam Templates',
      icon: FileText,
      count: templatesCount,
    },
    {
      id: 'results' as AdminSection,
      label: 'Exam Results',
      icon: ChartBar,
      count: resultsCount,
    },
    {
      id: 'sessions' as AdminSection,
      label: 'Exam Sessions',
      icon: Clock,
      count: sessionsCount,
    },
    {
      id: 'users' as AdminSection,
      label: 'User Management',
      icon: Users,
      count: usersCount,
    },
    {
      id: 'comments' as AdminSection,
      label: 'Comments',
      icon: MessageSquare,
      count: commentsCount,
    },
    {
      id: 'testing-feedback' as AdminSection,
      label: 'Testing Feedback',
      icon: ClipboardCheck,
      count: 0,
    },
    {
      id: 'api-validation' as AdminSection,
      label: 'API Contract Testing',
      icon: FileSearch,
      count: 0,
    },
    {
      id: 'route-testing' as AdminSection,
      label: 'Route Testing',
      icon: Network,
      count: 0,
    },
    {
      id: 'tour-management' as AdminSection,
      label: 'Tour Management',
      icon: Route,
      count: 0,
    },
    {
      id: 'debug' as AdminSection,
      label: 'Server Debug',
      icon: Bug,
      count: 0,
    },
  ];

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 60 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="bg-gray-900 text-white flex flex-col h-full"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="text-lg font-semibold"
              >
                Admin Dashboard
              </motion.h2>
            )}
          </AnimatePresence>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="text-white hover:bg-gray-800"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onSectionChange(item.id)}
              className={`w-full justify-start gap-3 ${
                isActive 
                  ? "bg-gray-700 text-white hover:bg-gray-600" 
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between flex-1"
                  >
                    <span className="text-sm">{item.label}</span>
                    <div className="flex items-center gap-1">
                     {item.count > 0 && (
                        <Badge variant="outline" className="text-xs text-white bg-gray-800 border-gray-600">
                          {item.count}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExitAdmin}
          className="w-full justify-start gap-3 text-gray-300 hover:bg-gray-800 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 flex-shrink-0" />
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="text-sm"
              >
                Exit Admin
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>
    </motion.div>
  );
};