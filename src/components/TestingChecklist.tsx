import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { 
  CheckCircle, 
  Circle, 
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  CheckSquare,
  ArrowLeft,
  MinusCircle,
  XCircle,
  Send,
  X,
  Menu,
  User,
  LayoutDashboard,
  FileQuestion,
  FileCheck,
  Settings,
  HelpCircle,
  Tag,
  FileText,
  MessageSquare,
  BarChart,
  Grid
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { motion, AnimatePresence } from "motion/react";
import { ThemeToggle } from "./ThemeToggle";

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

const STORAGE_KEY = 'exam-platform-testing-checklist';

const getShortDate = () => {
  const date = new Date();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
};

const generateVersionNumber = () => {
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const sequence = String(now.getTime()).slice(-3); // Last 3 digits of timestamp for uniqueness
  return `v1.0.${date}.${sequence}`;
};

const initialChecklistData: ChecklistData = {
  testerName: '',
  testDate: '',
  buildVersion: generateVersionNumber(),
  sections: [
    {
      id: 'auth',
      title: '1️⃣ User Authentication & Onboarding',
      notes: '',
      items: [
        { id: 'auth-1', text: 'Login page loads without errors', priority: '🔴', status: 'untested', comment: '' },
        { id: 'auth-2', text: 'Can create new account with email/password', priority: '🔴', status: 'untested', comment: '' },
        { id: 'auth-3', text: 'Email validation works (rejects invalid emails)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'auth-4', text: 'Password requirements enforced (if applicable)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'auth-5', text: '"Remember me" functionality works', priority: '🔴', status: 'untested', comment: '' },
        { id: 'auth-6', text: 'Login persists across page refreshes', priority: '🔴', status: 'untested', comment: '' },
        { id: 'auth-7', text: 'Logout button works correctly', priority: '🔴', status: 'untested', comment: '' },
        { id: 'auth-8', text: 'Session expires after timeout (if configured)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'auth-9', text: '"Forgot password" link works', priority: '🟡', status: 'untested', comment: '' },
        { id: 'auth-10', text: 'Password reset email sent (if configured)', priority: '🟡', status: 'untested', comment: '' },
        { id: 'auth-11', text: 'Can reset password successfully', priority: '🟡', status: 'untested', comment: '' },
        { id: 'auth-12', text: 'Old password no longer works after reset', priority: '🟡', status: 'untested', comment: '' },
      ]
    },
    {
      id: 'dashboard',
      title: '2️⃣ User Dashboard',
      notes: '',
      items: [
        { id: 'dash-1', text: 'Dashboard loads without errors', priority: '🔴', status: 'untested', comment: '' },
        { id: 'dash-2', text: 'User\'s name/email displayed correctly', priority: '🔴', status: 'untested', comment: '' },
        { id: 'dash-3', text: 'Navigation menu accessible', priority: '🔴', status: 'untested', comment: '' },
        { id: 'dash-4', text: 'Theme toggle works (light/dark mode)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'dash-5', text: 'All buttons/links functional', priority: '🔴', status: 'untested', comment: '' },
        { id: 'dash-6', text: 'All available exams displayed', priority: '🔴', status: 'untested', comment: '' },
        { id: 'dash-7', text: 'Exam cards show: title, description, question count, time limit', priority: '🔴', status: 'untested', comment: '' },
        { id: 'dash-8', text: '"More details" expandable section works', priority: '🔴', status: 'untested', comment: '' },
        { id: 'dash-9', text: '"Select Exam" button functional', priority: '🔴', status: 'untested', comment: '' },
        { id: 'dash-10', text: 'Exam templates appear in custom order (set by admin)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'dash-11', text: 'Free exams clearly marked', priority: '🔴', status: 'untested', comment: '' },
        { id: 'dash-12', text: 'Paid exams show credit cost', priority: '🔴', status: 'untested', comment: '' },
        { id: 'dash-13', text: 'Shows alert if exams in progress', priority: '🔴', status: 'untested', comment: '' },
        { id: 'dash-14', text: 'Lists all saved exams with progress %', priority: '🔴', status: 'untested', comment: '' },
        { id: 'dash-15', text: 'Shows time remaining for each saved exam', priority: '🔴', status: 'untested', comment: '' },
        { id: 'dash-16', text: 'Shows flagged question count', priority: '🔴', status: 'untested', comment: '' },
        { id: 'dash-17', text: '"Resume" button works', priority: '🔴', status: 'untested', comment: '' },
        { id: 'dash-18', text: 'Can view all saved exams in dialog', priority: '🔴', status: 'untested', comment: '' },
        { id: 'dash-19', text: 'Warning shown before starting new exam if one in progress', priority: '🔴', status: 'untested', comment: '' },
        { id: 'dash-20', text: 'Can view past exam results', priority: '🟡', status: 'untested', comment: '' },
        { id: 'dash-21', text: 'Results show: score, date, time spent', priority: '🟡', status: 'untested', comment: '' },
        { id: 'dash-22', text: 'Percentage calculated correctly', priority: '🟡', status: 'untested', comment: '' },
        { id: 'dash-23', text: 'Can view detailed results', priority: '🟡', status: 'untested', comment: '' },
        { id: 'dash-24', text: 'Can print/download results', priority: '🟡', status: 'untested', comment: '' },
      ]
    },
    {
      id: 'exam-interface',
      title: '3️⃣ Exam Taking Interface',
      notes: '',
      items: [
        { id: 'exam-1', text: 'Exam details dialog shows before start', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-2', text: 'Shows: question count, time limit, cost', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-3', text: '"Start Exam" button works', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-4', text: 'Exam loads with first question', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-5', text: 'Timer starts countdown', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-6', text: 'Cannot start same exam twice simultaneously', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-7', text: 'Question text displays correctly', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-8', text: 'All 4 answer options visible (A, B, C, D)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-9', text: 'Images display if present', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-10', text: 'Markdown formatting renders correctly', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-11', text: 'Code blocks formatted properly (if applicable)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-12', text: 'Reference text visible', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-13', text: 'Can select answer by clicking option', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-14', text: 'Selected answer highlights correctly', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-15', text: 'Can change answer before moving on', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-16', text: 'Selected answer persists when navigating away', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-17', text: 'Answer auto-saves', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-18', text: '"Next" button advances to next question', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-19', text: '"Previous" button goes to previous question', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-20', text: 'Question counter shows current/total (e.g., "5/50")', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-21', text: 'Can navigate using question index sidebar', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-22', text: 'Auto-advance to next question after selection (if enabled)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-23', text: '"Submit Exam" button appears on last question', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-24', text: 'Countdown timer visible in header', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-25', text: 'Timer counts down accurately', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-26', text: 'Warning shown at 5 minutes remaining', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-27', text: 'Warning shown at 1 minute remaining', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-28', text: 'Exam auto-submits when timer reaches 0', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-29', text: 'Timer persists across page refreshes', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-30', text: '"Index" button toggles sidebar', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-31', text: 'Shows all questions in list', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-32', text: 'Answered questions marked (checkmark/color)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-33', text: 'Unanswered questions clearly visible', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-34', text: 'Flagged questions marked with flag icon', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-35', text: 'Can click question to navigate directly', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-36', text: 'Flag button visible for each question', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-37', text: 'Can flag question for review', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-38', text: 'Flagged questions show flag icon', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-39', text: 'Can unflag question', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-40', text: 'Flagged count displayed in header', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-41', text: 'Flagged questions visible in index sidebar', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-42', text: 'Can add comment to question', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-43', text: 'Comment saves successfully', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-44', text: 'Comment persists on navigation', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-45', text: 'Can edit existing comment', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-46', text: 'Can delete comment', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-47', text: 'Comment icon shows when comment exists', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-48', text: '"Tools" dropdown accessible', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-49', text: 'Answer Eliminator option available', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-50', text: 'Can check boxes to eliminate answers', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-51', text: 'Eliminated answers show strikethrough', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-52', text: 'Eliminations persist when navigating away', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-53', text: 'Can un-eliminate answers', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-54', text: 'Highlighter button accessible', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-55', text: 'Can select text in question', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-56', text: 'Text highlights in selected color', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-57', text: 'Multiple highlights possible', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-58', text: 'Highlights persist across navigation', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-59', text: 'Can clear individual highlights', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-60', text: '"Clear All Highlights" works', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-61', text: 'Highlights work in both light/dark mode', priority: '🟡', status: 'untested', comment: '' },
        { id: 'exam-62', text: 'Can drag divider to resize panes', priority: '🟢', status: 'untested', comment: '' },
        { id: 'exam-63', text: 'Left pane (question) resizes smoothly', priority: '🟢', status: 'untested', comment: '' },
        { id: 'exam-64', text: 'Right pane (index) resizes smoothly', priority: '🟢', status: 'untested', comment: '' },
        { id: 'exam-65', text: 'Divider position persists', priority: '🟢', status: 'untested', comment: '' },
        { id: 'exam-66', text: 'Page refresh doesn\'t lose progress', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-67', text: 'Answers preserved after refresh', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-68', text: 'Timer resumes correctly after refresh', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-69', text: 'Flags/comments preserved after refresh', priority: '🔴', status: 'untested', comment: '' },
        { id: 'exam-70', text: 'Can close tab and resume later', priority: '🔴', status: 'untested', comment: '' },
      ]
    },
    {
      id: 'submission',
      title: '4️⃣ Exam Submission & Results',
      notes: '',
      items: [
        { id: 'sub-1', text: '"Submit Exam" dialog shows summary', priority: '🔴', status: 'untested', comment: '' },
        { id: 'sub-2', text: 'Shows answered/unanswered count', priority: '🔴', status: 'untested', comment: '' },
        { id: 'sub-3', text: 'Shows flagged questions (if any)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'sub-4', text: 'Warning if unanswered questions remain', priority: '🔴', status: 'untested', comment: '' },
        { id: 'sub-5', text: 'Can cancel and return to exam', priority: '🔴', status: 'untested', comment: '' },
        { id: 'sub-6', text: '"Submit" button finalizes exam', priority: '🔴', status: 'untested', comment: '' },
        { id: 'sub-7', text: 'Cannot return after submission', priority: '🔴', status: 'untested', comment: '' },
        { id: 'sub-8', text: 'Results page shows immediately after submit', priority: '🔴', status: 'untested', comment: '' },
        { id: 'sub-9', text: 'Score displayed correctly (X/Total)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'sub-10', text: 'Percentage calculated correctly', priority: '🔴', status: 'untested', comment: '' },
        { id: 'sub-11', text: 'Pass/Fail status shown (if applicable)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'sub-12', text: 'Time spent displayed', priority: '🔴', status: 'untested', comment: '' },
        { id: 'sub-13', text: 'Exam title shown', priority: '🔴', status: 'untested', comment: '' },
        { id: 'sub-14', text: 'Can view question-by-question breakdown', priority: '🔴', status: 'untested', comment: '' },
        { id: 'sub-15', text: 'Shows: question, your answer, correct answer', priority: '🔴', status: 'untested', comment: '' },
        { id: 'sub-16', text: 'Correct answers highlighted in green', priority: '🔴', status: 'untested', comment: '' },
        { id: 'sub-17', text: 'Incorrect answers highlighted in red', priority: '🔴', status: 'untested', comment: '' },
        { id: 'sub-18', text: 'Reference shown for each question', priority: '🔴', status: 'untested', comment: '' },
        { id: 'sub-19', text: 'Category shown for each question', priority: '🔴', status: 'untested', comment: '' },
        { id: 'sub-20', text: 'Comments visible in results', priority: '🔴', status: 'untested', comment: '' },
        { id: 'sub-21', text: '"Print Results" works', priority: '🟡', status: 'untested', comment: '' },
        { id: 'sub-22', text: 'Print layout clean and professional', priority: '🟡', status: 'untested', comment: '' },
        { id: 'sub-23', text: '"Download PDF" works (if implemented)', priority: '🟡', status: 'untested', comment: '' },
        { id: 'sub-24', text: '"Back to Dashboard" returns to dashboard', priority: '🟡', status: 'untested', comment: '' },
        { id: 'sub-25', text: 'Results saved to history', priority: '🟡', status: 'untested', comment: '' },
        { id: 'sub-26', text: 'Can view results again from history', priority: '🟡', status: 'untested', comment: '' },
      ]
    },
    {
      id: 'admin-overview',
      title: '5️⃣ Admin Dashboard',
      notes: '',
      items: [
        { id: 'adm-1', text: 'Can access admin area', priority: '🔴', status: 'untested', comment: '' },
        { id: 'adm-2', text: 'Admin dashboard loads', priority: '🔴', status: 'untested', comment: '' },
        { id: 'adm-3', text: 'Sidebar navigation works', priority: '🔴', status: 'untested', comment: '' },
        { id: 'adm-4', text: 'All sections accessible', priority: '🔴', status: 'untested', comment: '' },
        { id: 'adm-5', text: 'Shows total questions count', priority: '🟡', status: 'untested', comment: '' },
        { id: 'adm-6', text: 'Shows total templates count', priority: '🟡', status: 'untested', comment: '' },
        { id: 'adm-7', text: 'Shows total users (if implemented)', priority: '🟡', status: 'untested', comment: '' },
        { id: 'adm-8', text: 'Shows recent activity', priority: '🟡', status: 'untested', comment: '' },
        { id: 'adm-9', text: 'Charts/graphs display correctly', priority: '🟡', status: 'untested', comment: '' },
      ]
    },
    {
      id: 'admin-questions',
      title: '6️⃣ Admin: Question Management',
      notes: '',
      items: [
        { id: 'aq-1', text: 'Questions list displays', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-2', text: 'Shows: question text (preview), category, difficulty', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-3', text: 'Search works', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-4', text: 'Filter by category works', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-5', text: 'Filter by difficulty works', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-6', text: 'Filter by status (draft/final) works', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-7', text: 'Pagination works (if many questions)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-8', text: '"Add Question" button works', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-9', text: 'Dialog opens', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-10', text: 'Can enter question text', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-11', text: 'Can enter 4 answer options', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-12', text: 'Can select correct answer', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-13', text: 'Can select category from dropdown', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-14', text: 'Can enter reference', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-15', text: 'Can set difficulty (Easy/Medium/Hard)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-16', text: 'Can set status (Draft/Final)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-17', text: 'Validation works (all fields required)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-18', text: '"Save" creates new question', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-19', text: 'New question appears in list', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-20', text: 'Can click to edit existing question', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-21', text: 'Dialog pre-fills with existing data', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-22', text: 'Can modify all fields', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-23', text: 'Changes save correctly', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-24', text: 'Updated question reflects changes', priority: '🔴', status: 'untested', comment: '' },
        { id: 'aq-25', text: 'Delete button visible', priority: '🟡', status: 'untested', comment: '' },
        { id: 'aq-26', text: 'Confirmation dialog appears', priority: '🟡', status: 'untested', comment: '' },
        { id: 'aq-27', text: 'Can cancel deletion', priority: '🟡', status: 'untested', comment: '' },
        { id: 'aq-28', text: '"Confirm" deletes question', priority: '🟡', status: 'untested', comment: '' },
        { id: 'aq-29', text: 'Question removed from list', priority: '🟡', status: 'untested', comment: '' },
        { id: 'aq-30', text: 'Can view full question details', priority: '🟡', status: 'untested', comment: '' },
        { id: 'aq-31', text: 'Shows all metadata (ID, timestamps, etc.)', priority: '🟡', status: 'untested', comment: '' },
        { id: 'aq-32', text: 'Shows usage statistics (if implemented)', priority: '🟡', status: 'untested', comment: '' },
        { id: 'aq-33', text: 'Import button accessible', priority: '🟢', status: 'untested', comment: '' },
        { id: 'aq-34', text: 'Can upload JSON file', priority: '🟢', status: 'untested', comment: '' },
        { id: 'aq-35', text: 'File validation works', priority: '🟢', status: 'untested', comment: '' },
        { id: 'aq-36', text: 'Import progress shown', priority: '🟢', status: 'untested', comment: '' },
        { id: 'aq-37', text: 'Success/error messages clear', priority: '🟢', status: 'untested', comment: '' },
        { id: 'aq-38', text: 'Imported questions appear in list', priority: '🟢', status: 'untested', comment: '' },
      ]
    },
    {
      id: 'admin-categories',
      title: '7️⃣ Admin: Question Categories',
      notes: '',
      items: [
        { id: 'ac-1', text: 'Categories list displays', priority: '🔴', status: 'untested', comment: '' },
        { id: 'ac-2', text: 'Shows question count per category', priority: '🔴', status: 'untested', comment: '' },
        { id: 'ac-3', text: 'Categories sorted alphabetically', priority: '🔴', status: 'untested', comment: '' },
        { id: 'ac-4', text: 'Low-count categories highlighted (< 10 questions)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'ac-5', text: '"Add Category" button works', priority: '🔴', status: 'untested', comment: '' },
        { id: 'ac-6', text: 'Can enter category name', priority: '🔴', status: 'untested', comment: '' },
        { id: 'ac-7', text: 'Validation prevents duplicates', priority: '🔴', status: 'untested', comment: '' },
        { id: 'ac-8', text: 'New category appears in list', priority: '🔴', status: 'untested', comment: '' },
        { id: 'ac-9', text: 'New category available in dropdowns', priority: '🔴', status: 'untested', comment: '' },
        { id: 'ac-10', text: 'Can edit category name', priority: '🟡', status: 'untested', comment: '' },
        { id: 'ac-11', text: 'Changes reflect everywhere', priority: '🟡', status: 'untested', comment: '' },
        { id: 'ac-12', text: 'Questions update to new category name', priority: '🟡', status: 'untested', comment: '' },
        { id: 'ac-13', text: 'Delete button visible', priority: '🟡', status: 'untested', comment: '' },
        { id: 'ac-14', text: 'Warning if category has questions', priority: '🟡', status: 'untested', comment: '' },
        { id: 'ac-15', text: 'Confirmation required', priority: '🟡', status: 'untested', comment: '' },
        { id: 'ac-16', text: 'Category removed from list', priority: '🟡', status: 'untested', comment: '' },
      ]
    },
    {
      id: 'admin-templates',
      title: '8️⃣ Admin: Exam Templates',
      notes: '',
      items: [
        { id: 'at-1', text: 'Templates list displays', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-2', text: 'Shows: title, description, question count, time limit', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-3', text: 'Card view works', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-4', text: 'Table view works', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-5', text: 'Can switch between views', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-6', text: '"Add Template" button works', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-7', text: 'Can enter title', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-8', text: 'Can enter description', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-9', text: 'Can enter "More Details" (markdown)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-10', text: 'Can set question count', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-11', text: 'Can set time limit (minutes)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-12', text: 'Can set template name (e.g., "02 Journeyman")', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-13', text: 'Can set price (credits)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-14', text: 'Can configure question categories (questions per category)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-15', text: 'Validation works', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-16', text: 'New template appears in list', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-17', text: 'Can edit existing template', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-18', text: 'Dialog pre-fills with data', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-19', text: 'Can modify all fields', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-20', text: 'Changes save correctly', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-21', text: 'Updated template reflects changes', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-22', text: 'Delete button visible', priority: '🟡', status: 'untested', comment: '' },
        { id: 'at-23', text: 'Confirmation required', priority: '🟡', status: 'untested', comment: '' },
        { id: 'at-24', text: 'Template deleted successfully', priority: '🟡', status: 'untested', comment: '' },
        { id: 'at-25', text: '"Duplicate" button works', priority: '🟢', status: 'untested', comment: '' },
        { id: 'at-26', text: 'Creates copy with " (Copy)" suffix', priority: '🟢', status: 'untested', comment: '' },
        { id: 'at-27', text: 'Can edit duplicated template', priority: '🟢', status: 'untested', comment: '' },
        { id: 'at-28', text: 'Can grab template with handle icon', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-29', text: 'Can drag template to new position', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-30', text: 'Template moves instantly (optimistic update)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-31', text: 'NO "Loading..." screen appears during drag', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-32', text: 'Toast notification confirms save', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-33', text: 'Order persists after page refresh', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-34', text: 'Order shows correctly on user-facing exam selection', priority: '🔴', status: 'untested', comment: '' },
        { id: 'at-35', text: 'Falls back to alphabetical if no order set', priority: '🔴', status: 'untested', comment: '' },
      ]
    },
    {
      id: 'admin-comments',
      title: '9️⃣ Admin: User Comments',
      notes: '',
      items: [
        { id: 'acm-1', text: 'Comments list displays', priority: '🔴', status: 'untested', comment: '' },
        { id: 'acm-2', text: 'Shows: user, question, comment text', priority: '🔴', status: 'untested', comment: '' },
        { id: 'acm-3', text: 'Shows disposition (Needs Attention/Under Review/Solved)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'acm-4', text: 'Shows type (Bug/UI/UX/Question Quality/etc.)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'acm-5', text: 'Sorted by date (newest first)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'acm-6', text: 'Can filter by disposition', priority: '🟡', status: 'untested', comment: '' },
        { id: 'acm-7', text: 'Can filter by type', priority: '🟡', status: 'untested', comment: '' },
        { id: 'acm-8', text: '"All" shows all comments', priority: '🟡', status: 'untested', comment: '' },
        { id: 'acm-9', text: 'Filter count updates correctly', priority: '🟡', status: 'untested', comment: '' },
        { id: 'acm-10', text: '"Manage" button opens dialog', priority: '🔴', status: 'untested', comment: '' },
        { id: 'acm-11', text: 'Can change comment type', priority: '🔴', status: 'untested', comment: '' },
        { id: 'acm-12', text: 'Can change disposition', priority: '🔴', status: 'untested', comment: '' },
        { id: 'acm-13', text: 'Can add admin response', priority: '🔴', status: 'untested', comment: '' },
        { id: 'acm-14', text: 'Changes save correctly', priority: '🔴', status: 'untested', comment: '' },
        { id: 'acm-15', text: 'Clicking question ID opens question details dialog', priority: '🔴', status: 'untested', comment: '' },
        { id: 'acm-16', text: 'Dialog shows full question', priority: '🔴', status: 'untested', comment: '' },
        { id: 'acm-17', text: 'Can navigate to question in Questions section', priority: '🔴', status: 'untested', comment: '' },
        { id: 'acm-18', text: 'Delete button visible', priority: '🟡', status: 'untested', comment: '' },
        { id: 'acm-19', text: 'Confirmation required', priority: '🟡', status: 'untested', comment: '' },
        { id: 'acm-20', text: 'Comment deleted successfully', priority: '🟡', status: 'untested', comment: '' },
      ]
    },
    {
      id: 'admin-results',
      title: '🔟 Admin: Exam Results',
      notes: '',
      items: [
        { id: 'ar-1', text: 'Results list displays', priority: '🔴', status: 'untested', comment: '' },
        { id: 'ar-2', text: 'Shows: user, exam title, score, date', priority: '🔴', status: 'untested', comment: '' },
        { id: 'ar-3', text: 'Search works', priority: '🔴', status: 'untested', comment: '' },
        { id: 'ar-4', text: 'Filter by template works', priority: '🔴', status: 'untested', comment: '' },
        { id: 'ar-5', text: 'Filter by pass/fail works (if applicable)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'ar-6', text: 'Can click to view full result', priority: '🔴', status: 'untested', comment: '' },
        { id: 'ar-7', text: 'Shows all answers', priority: '🔴', status: 'untested', comment: '' },
        { id: 'ar-8', text: 'Shows correct/incorrect', priority: '🔴', status: 'untested', comment: '' },
        { id: 'ar-9', text: 'Shows time spent', priority: '🔴', status: 'untested', comment: '' },
        { id: 'ar-10', text: 'Shows comments/flags (if any)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'ar-11', text: 'Can export to CSV', priority: '🟢', status: 'untested', comment: '' },
        { id: 'ar-12', text: 'Can export to PDF', priority: '🟢', status: 'untested', comment: '' },
        { id: 'ar-13', text: 'Export includes all relevant data', priority: '🟢', status: 'untested', comment: '' },
      ]
    },
    {
      id: 'cross-cutting',
      title: '1️⃣1️⃣ Cross-Cutting Concerns',
      notes: '',
      items: [
        { id: 'cc-1', text: 'Works on desktop (1920x1080)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'cc-2', text: 'Works on laptop (1366x768)', priority: '🔴', status: 'untested', comment: '' },
        { id: 'cc-3', text: 'Works on tablet (iPad)', priority: '🟡', status: 'untested', comment: '' },
        { id: 'cc-4', text: 'Works on phone (iPhone/Android)', priority: '🟡', status: 'untested', comment: '' },
        { id: 'cc-5', text: 'Chrome/Edge browser compatible', priority: '🔴', status: 'untested', comment: '' },
        { id: 'cc-6', text: 'Firefox browser compatible', priority: '🔴', status: 'untested', comment: '' },
        { id: 'cc-7', text: 'Safari browser compatible', priority: '🔴', status: 'untested', comment: '' },
        { id: 'cc-8', text: 'Light theme works correctly', priority: '🔴', status: 'untested', comment: '' },
        { id: 'cc-9', text: 'Dark theme works correctly', priority: '🔴', status: 'untested', comment: '' },
        { id: 'cc-10', text: 'Text readable in all themes', priority: '🔴', status: 'untested', comment: '' },
        { id: 'cc-11', text: 'Page loads in < 3 seconds', priority: '🟡', status: 'untested', comment: '' },
        { id: 'cc-12', text: 'Interactions feel responsive', priority: '🟡', status: 'untested', comment: '' },
        { id: 'cc-13', text: 'No console errors during normal use', priority: '🔴', status: 'untested', comment: '' },
        { id: 'cc-14', text: 'No visual glitches/broken layouts', priority: '🔴', status: 'untested', comment: '' },
        { id: 'cc-15', text: 'Error messages clear and helpful', priority: '🟡', status: 'untested', comment: '' },
      ]
    },
  ]
};

export function TestingChecklist({ onBack, isAdmin = false }: { onBack?: () => void; isAdmin?: boolean }) {
  const [data, setData] = useState<ChecklistData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Validate basic structure before attempting migration
        if (!parsed || typeof parsed !== 'object') {
          console.warn('Invalid localStorage data: not an object, using defaults');
          return initialChecklistData;
        }
        
        if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
          console.warn('Invalid localStorage data: sections missing or empty, using defaults');
          return initialChecklistData;
        }
        
        // Ensure all items have the new fields and proper defaults
        const migrated: ChecklistData = {
          testerName: parsed.testerName || '',
          testDate: parsed.testDate || '',
          buildVersion: parsed.buildVersion || generateVersionNumber(),
          sections: parsed.sections.map((section: ChecklistSection) => ({
            id: section.id,
            title: section.title,
            notes: section.notes || '',
            items: Array.isArray(section.items) ? section.items.map((item: any) => ({
              id: item.id,
              text: item.text,
              priority: item.priority,
              status: item.status || (item.checked ? 'yes' : 'untested'),
              comment: item.comment || '',
              testedDate: item.testedDate,
              testedOnVersion: item.testedOnVersion, // Preserve version tracking from localStorage
            })) : []
          }))
        };
        return migrated;
      } catch (error) {
        console.error('Error loading checklist from localStorage:', error);
        return initialChecklistData;
      }
    }
    return initialChecklistData;
  });

  const [currentSection, setCurrentSection] = useState<string>(data.sections[0]?.id || 'auth');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165`;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('💾 Checklist state saved to localStorage:', {
      testerName: data.testerName,
      testDate: data.testDate,
      buildVersion: data.buildVersion,
      sections: data.sections.length,
    });
  }, [data]);

  const updateItem = (sectionId: string, itemId: string, field: 'status' | 'comment', value: string) => {
    setData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map(item =>
                item.id === itemId
                  ? {
                      ...item,
                      [field]: value,
                      testedDate: field === 'status' && value !== 'untested' ? getShortDate() : item.testedDate,
                      testedOnVersion: field === 'status' && value !== 'untested' ? prev.buildVersion : item.testedOnVersion,
                    }
                  : item
              )
            }
          : section
      )
    }));
  };

  const updateSectionNotes = (sectionId: string, notes: string) => {
    setData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, notes } : section
      )
    }));
  };

  const getProgressStats = (section: ChecklistSection) => {
    const total = section.items.length;
    const tested = section.items.filter(item => item.status !== 'untested').length;
    const yes = section.items.filter(item => item.status === 'yes').length;
    const partial = section.items.filter(item => item.status === 'partial').length;
    const no = section.items.filter(item => item.status === 'no').length;
    const percentage = total > 0 ? Math.round((tested / total) * 100) : 0;
    
    return { total, tested, yes, partial, no, percentage };
  };

  const getTotalStats = () => {
    // Filter out admin sections if user is not an admin
    const visibleSections = data.sections.filter(section => {
      if (!isAdmin && section.id.startsWith('admin-')) {
        return false;
      }
      return true;
    });
    
    const allItems = visibleSections.flatMap(s => s.items);
    const totalItems = allItems.length;
    const tested = allItems.filter(item => item.status !== 'untested').length;
    const yesItems = allItems.filter(item => item.status === 'yes').length;
    const partialItems = allItems.filter(item => item.status === 'partial').length;
    const noItems = allItems.filter(item => item.status === 'no').length;
    const percentage = totalItems > 0 ? Math.round((tested / totalItems) * 100) : 0;
    
    return { totalItems, tested, yesItems, partialItems, noItems, percentage };
  };



  const resetData = () => {
    if (confirm('Are you sure you want to reset the checklist? This cannot be undone.')) {
      setData({
        ...initialChecklistData,
        testerName: data.testerName,
        buildVersion: generateVersionNumber(),
      });
      toast.success('Checklist reset successfully');
    }
  };

  const submitFeedback = async () => {
    // Validate required fields
    if (!data.testerName || !data.testerName.trim()) {
      toast.error('Please enter your name before submitting');
      return;
    }

    if (!data.buildVersion) {
      toast.error('Build version is missing. Please refresh and try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Use deterministic ID based on tester name + version to enable updates
      // This prevents duplicate submissions when user submits multiple times
      const userSlug = data.testerName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const versionSlug = data.buildVersion.replace(/[^a-z0-9]+/g, '-');
      const feedbackId = `testing-feedback:${userSlug}-${versionSlug}`;

      const submissionData = {
        id: feedbackId,
        version: data.buildVersion,
        testerName: data.testerName.trim(),
        submittedAt: new Date().toISOString(),
        data: {
          testerName: data.testerName.trim(),
          testDate: data.testDate || new Date().toISOString().split('T')[0],
          buildVersion: data.buildVersion,
          sections: data.sections,
        },
      };

      console.log('📝 Submitting testing feedback:', {
        id: feedbackId,
        version: data.buildVersion,
        testerName: data.testerName,
        sectionCount: data.sections.length,
        totalItems: data.sections.reduce((sum, s) => sum + s.items.length, 0),
        note: 'Using deterministic ID to update existing submission if present'
      });

      const response = await fetch(`${serverUrl}/testing-feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Submission successful:', result);
        toast.success('Feedback submitted successfully! Thank you!');
        // Optionally reset after submission
        // resetData();
      } else {
        const errorText = await response.text();
        console.error('❌ Submission error:', errorText);
        
        // Try to parse error message
        try {
          const errorJson = JSON.parse(errorText);
          toast.error(errorJson.error || 'Failed to submit feedback. Please try again.');
        } catch {
          toast.error('Failed to submit feedback. Please try again.');
        }
      }
    } catch (error) {
      console.error('❌ Submission error:', error);
      toast.error('Failed to submit feedback. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalStats = getTotalStats();
  const currentSectionData = data.sections.find(s => s.id === currentSection) || data.sections[0];
  const currentStats = getProgressStats(currentSectionData);

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'yes':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'partial':
        return <MinusCircle className="h-4 w-4 text-yellow-500" />;
      case 'no':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSectionIcon = (sectionId: string) => {
    const iconMap: Record<string, React.ElementType> = {
      'auth': User,
      'dashboard': LayoutDashboard,
      'exam-interface': FileQuestion,
      'submission': FileCheck,
      'admin-overview': Settings,
      'admin-questions': FileQuestion,
      'admin-categories': Tag,
      'admin-templates': FileText,
      'admin-comments': MessageSquare,
      'admin-results': BarChart,
      'cross-cutting': Grid,
    };
    return iconMap[sectionId] || HelpCircle;
  };

  return (
    <div className="flex h-full w-full">
      {/* Left Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: isSidebarCollapsed ? 60 : 280 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="bg-gray-900 text-white flex flex-col border-r border-gray-700 h-full overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <AnimatePresence mode="wait">
              {!isSidebarCollapsed && (
                <motion.h2
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="text-lg font-semibold"
                >
                  App Sections
                </motion.h2>
              )}
            </AnimatePresence>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="text-white hover:bg-gray-800"
            >
              {isSidebarCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
          </div>
          
          {/* Overall Progress */}
          <AnimatePresence mode="wait">
            {!isSidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2 mt-4"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Overall Progress</span>
                  <span className="text-gray-300">
                    {totalStats.tested}/{totalStats.totalItems} ({totalStats.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden flex">
                  <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${(totalStats.yesItems / totalStats.totalItems) * 100}%` }}
                  />
                  <div
                    className="bg-yellow-500 transition-all"
                    style={{ width: `${(totalStats.partialItems / totalStats.totalItems) * 100}%` }}
                  />
                  <div
                    className="bg-red-500 transition-all"
                    style={{ width: `${(totalStats.noItems / totalStats.totalItems) * 100}%` }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section Navigation */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <nav className="space-y-1 p-2">
            {data.sections
              .filter(section => {
                // Filter out admin sections if user is not an admin
                if (!isAdmin && section.id.startsWith('admin-')) {
                  return false;
                }
                return true;
              })
              .map((section) => {
              const stats = getProgressStats(section);
              const isActive = currentSection === section.id;
              const Icon = getSectionIcon(section.id);
              
              return (
                <Button
                  key={section.id}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentSection(section.id)}
                  className={`w-full justify-start gap-3 ${
                    isSidebarCollapsed ? 'flex-row items-center h-auto py-3 px-3' : 'flex-col items-start h-auto py-3 px-3'
                  } ${
                    isActive 
                      ? "bg-gray-700 text-white hover:bg-gray-600" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <AnimatePresence mode="wait">
                    {!isSidebarCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 w-full"
                      >
                        <span className="text-sm w-full text-left block">{section.title}</span>
                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden flex mt-1.5">
                          <div
                            className="bg-green-500"
                            style={{ width: `${(stats.yes / stats.total) * 100}%` }}
                          />
                          <div
                            className="bg-yellow-500"
                            style={{ width: `${(stats.partial / stats.total) * 100}%` }}
                          />
                          <div
                            className="bg-red-500"
                            style={{ width: `${(stats.no / stats.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 mt-1 block">
                          {stats.percentage}% • {stats.tested}/{stats.total}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              );
            })}
            </nav>
          </ScrollArea>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-700 space-y-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetData}
            className="w-full justify-start gap-3 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <RotateCcw className="h-4 w-4 flex-shrink-0" />
            <AnimatePresence mode="wait">
              {!isSidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm"
                >
                  Reset
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Info Card */}
        <div className="p-6 pr-20 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold">Feedback</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Any feedback helps - share as much or as little as you like</p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              {onBack && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBack}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Landing Page
                </Button>
              )}
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Tester Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tester-name">Your Name *</Label>
                  <Input
                    id="tester-name"
                    value={data.testerName}
                    onChange={(e) => setData({ ...data, testerName: e.target.value })}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="test-date">Test Date</Label>
                  <Input
                    id="test-date"
                    type="date"
                    value={data.testDate}
                    onChange={(e) => setData({ ...data, testDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="build-version">Build Version</Label>
                  <div className="flex gap-2">
                    <Input
                      id="build-version"
                      value={data.buildVersion}
                      onChange={(e) => setData({ ...data, buildVersion: e.target.value })}
                      placeholder="e.g., v1.0.2025-10-20"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newVersion = generateVersionNumber();
                        setData({ ...data, buildVersion: newVersion });
                        toast.success(`Version updated to ${newVersion}`);
                      }}
                      className="gap-2 flex-shrink-0"
                      title="Generate new version number"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Auto
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Manually edit or click Auto to generate new version
                  </p>
                </div>
              </div>

              <Button
                onClick={submitFeedback}
                disabled={isSubmitting || !data.testerName.trim()}
                className="w-full gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Circle className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Feedback to Admin
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Section Content */}
        <div className="flex-1 overflow-auto p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{currentSectionData.title}</CardTitle>
                  <CardDescription>
                    {currentStats.tested} of {currentStats.total} items tested ({currentStats.percentage}%)
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    {currentStats.yes}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <MinusCircle className="h-3 w-3 text-yellow-500" />
                    {currentStats.partial}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <XCircle className="h-3 w-3 text-red-500" />
                    {currentStats.no}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Section Notes */}
              <div className="space-y-2">
                <Label htmlFor="section-notes">Section Notes (Optional)</Label>
                <Textarea
                  id="section-notes"
                  value={currentSectionData.notes}
                  onChange={(e) => updateSectionNotes(currentSectionData.id, e.target.value)}
                  placeholder="Add any general notes about this section..."
                  rows={3}
                />
              </div>

              {/* Checklist Items */}
              <div className="space-y-4">
                {currentSectionData.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 border rounded-lg space-y-3 bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(item.status)}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {item.priority && <span>{item.priority}</span>}
                              <span className="text-sm">{item.text}</span>
                            </div>
                            {item.testedDate && (
                              <span className="text-xs text-muted-foreground">
                                Tested: {item.testedDate}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Radio Group */}
                        <RadioGroup
                          value={item.status}
                          onValueChange={(value) => updateItem(currentSectionData.id, item.id, 'status', value)}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id={`${item.id}-yes`} />
                            <Label htmlFor={`${item.id}-yes`} className="cursor-pointer text-sm">
                              ✅ Yes
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="partial" id={`${item.id}-partial`} />
                            <Label htmlFor={`${item.id}-partial`} className="cursor-pointer text-sm">
                              ⚠️ Partial
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id={`${item.id}-no`} />
                            <Label htmlFor={`${item.id}-no`} className="cursor-pointer text-sm">
                              ❌ No
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="untested" id={`${item.id}-untested`} />
                            <Label htmlFor={`${item.id}-untested`} className="cursor-pointer text-sm">
                              ⚪ Untested
                            </Label>
                          </div>
                        </RadioGroup>

                        {/* Comment */}
                        {item.status !== 'untested' && (
                          <Textarea
                            value={item.comment}
                            onChange={(e) => updateItem(currentSectionData.id, item.id, 'comment', e.target.value)}
                            placeholder="Add comment (optional)"
                            rows={2}
                            className="text-sm"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
