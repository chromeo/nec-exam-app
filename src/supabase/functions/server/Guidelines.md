<!-- Updated: Sunday, October 26, 2025 - Completed Question Type Alignment -->
<!-- Updated: Monday, October 27, 2025 - Completed Validation Schema Fixes -->
<!-- Updated: Tuesday, October 28, 2025 - Rich Text Editor Switched to Jodit -->
<!-- Updated: Tuesday, October 28, 2025 - Database Key Standardization Proposal -->
<!-- Updated: Wednesday, October 29, 2025 - Tour Timer Pause UX Fix -->
<!-- Updated: Friday, October 31, 2025 - Comment Interface Type Safety Fixes -->
<!-- Updated: Friday, October 31, 2025 - Fixed Comment CRUD Operations (DELETE/UPDATE) -->
<!-- Updated: Friday, October 31, 2025 - Clean Comment Architecture Implementation -->
<!-- Updated: Saturday, November 1, 2025 - Fixed Exam Submission Comment Creation (mset bug) -->
<!-- Updated: Saturday, November 1, 2025 - Unified Comment System with Categories -->
<!-- Updated: Saturday, November 1, 2025 - Simplified Exam Results Status to 3 Options -->
<!-- Updated: Saturday, November 1, 2025 - Consolidated ExamSession Interface -->
<!-- Updated: Saturday, November 1, 2025 - Fixed getByPrefixWithFallback to Merge Results -->
<!-- Updated: Saturday, November 1, 2025 - Added Sessions Section & Auto-Cleanup -->
<!-- Updated: Saturday, November 1, 2025 - Fixed SessionsSection API Pattern -->
<!-- Updated: Saturday, November 1, 2025 - Added Type Safety Testing Infrastructure -->
<!-- Updated: Saturday, November 1, 2025 - Fixed Type Testing API URL (hardcoded projectId) -->
<!-- Updated: Saturday, November 1, 2025 - Fixed ExamTemplate Optional Fields (updatedAt, template_name) -->
<!-- Updated: Saturday, November 1, 2025 - Added 'Other' Legacy Comment Category -->
<!-- Updated: Saturday, November 1, 2025 - Removed API Documentation Section (YAGNI) -->
<!-- Updated: Saturday, November 1, 2025 - Fixed Guidelines.md Auto-Sync (Server Reads File) -->
<!-- Updated: Saturday, November 1, 2025 - Improved Session Timeout UX (Auto-Redirect) -->
<!-- Updated: Sunday, November 2, 2025 - Session Timeout Console Logging (Info not Error) -->
<!-- Updated: Sunday, November 2, 2025 - Persistent Login "Stay Logged In" Feature -->
<!-- Updated: Sunday, November 23, 2025 - Fixed Dark Mode Button Visibility & Color Schemes -->
<!-- Updated: Friday, November 21, 2025 - Edition-Aware Data Model (Phase 1) -->
# Exam Platform Development Guidelines

## 🎨 Dark Mode & Color Scheme Standards

**Fixed: Sunday, November 23, 2025**

### Critical Lesson: Always Define Both Primary Variables

When implementing color schemes or updating dark mode colors in `globals.css`, you MUST define BOTH variables:
- `--primary` (button background color)
- `--primary-foreground` (text color on primary buttons)

**What Went Wrong:**
1. Updated `globals.css` dark mode with new `--primary` and `--primary-foreground` values
2. ColorSchemeToggle component was only setting `--primary` for each color scheme
3. When user selected a non-default scheme, `--primary` changed but `--primary-foreground` stayed as the default value
4. Result: White-on-white or light-on-light buttons (invisible!)

**The Fix:**
- ✅ All color schemes in `ColorSchemeToggle.tsx` now define `--primary-foreground`
- ✅ Light mode schemes use dark primary colors with white text
- ✅ Dark mode schemes use bright/saturated primary colors with white text

**Files Fixed:**
- `/components/ColorSchemeToggle.tsx` - Added `--primary-foreground` to all 6 color schemes
- `/components/ui/button.tsx` - Changed dark mode hover from `accent/50` to `white/20` for visibility
- `/components/ui/badge.tsx` - Added `dark:bg-white/10` to secondary variant

**Color Scheme Principles:**
1. **Light Mode**: Use dark, saturated colors (e.g., `#0369a1` blue-700) with white text
2. **Dark Mode**: Use bright, saturated colors (e.g., `#0ea5e9` blue-500) with white text
3. **Hover States**: Use `white/20` overlay in dark mode (not dark color with opacity)
4. **Always Test**: Check both light and dark modes with ALL color schemes

---

## 📚 Edition-Aware Architecture (NEW)

**Implemented: Friday, November 21, 2025 - Phase 1 Complete**

The exam platform now supports **edition-aware questions and templates** to handle NEC code updates across multiple editions (2014, 2017, 2020, 2023, 2026).

### Core Principle

**Problem**: The National Electrical Code is updated every 3 years. Code references change, sections get renumbered, and categories may shift between editions. We need to track which questions apply to which editions without duplicating questions.

**Solution**: Each question can specify which NEC editions it applies to, with edition-specific metadata for category and reference.

### NEC Editions Supported

```typescript
export const NEC_EDITIONS = [
  'NEC-2014',
  'NEC-2017',
  'NEC-2020',
  'NEC-2023',
  'NEC-2026',
] as const;

export type NecEdition = typeof NEC_EDITIONS[number];
```

### Question Edition Metadata

Each question now has an `editions` array containing edition-specific information:

```typescript
interface QuestionEdition {
  code: NecEdition;          // "NEC-2023", "NEC-2026", etc.
  category: string;          // Category for THIS edition (can differ)
  reference?: string;        // Code reference for THIS edition (can differ)
  isValid: boolean;          // Is this question applicable to this edition?
  notes?: string;            // Admin notes about what changed
  updatedAt?: string;        // When this edition metadata was last updated
}
```

**Example - Question valid for multiple editions:**
```json
{
  "id": "1732201234567-abc123xyz",
  "question": "What size overcurrent protection is required for 14 AWG copper conductors?",
  "options": ["15 amperes", "20 amperes", "25 amperes", "30 amperes"],
  "correctAnswer": 0,
  "editions": [
    {
      "code": "NEC-2020",
      "category": "Overcurrent Protection",
      "reference": "240.4(D)(3)",
      "isValid": true
    },
    {
      "code": "NEC-2023",
      "category": "Overcurrent Protection",
      "reference": "240.4(D)(3)",
      "isValid": true
    },
    {
      "code": "NEC-2026",
      "category": "Overcurrent Protection",
      "reference": "240.5(A)(2)",
      "isValid": true,
      "notes": "Reference changed from 240.4(D)(3) to 240.5(A)(2) in 2026 edition"
    }
  ],
  "category": "Overcurrent Protection",
  "reference": "240.4(D)(3)",
  "difficulty": "Medium",
  "status": "Final"
}
```

### Exam Template Edition

Templates now specify which NEC edition they're based on:

```typescript
interface ExamTemplate {
  id: string;
  title: string;
  description: string;
  edition: NecEdition;          // NEW: "NEC-2023", "NEC-2026", etc.
  questionCategories: Record<string, number>;
  timeLimit: number;
  // ... other fields
}
```

### Question Selection Logic (Server-Side)

When generating an exam from a template:

1. Get template edition
2. Filter questions to only those with matching edition entry and isValid: true
3. Use edition-specific metadata for category and reference
4. Group by edition-specific category name
5. Select random questions per category count

### Benefits

✅ **Single Source of Truth** - One question record, multiple editions  
✅ **Historical Preservation** - Track how code references change over time  
✅ **Flexible Categories** - Category names can differ by edition  
✅ **Accurate References** - Code reference specific to each edition  
✅ **Easy Migration** - Backward compatible with existing data  
✅ **Admin Friendly** - Manage editions without duplicating questions  
✅ **Audit Trail** - Notes field documents changes between editions  

### Backward Compatibility

**Legacy Fields Preserved:**
- `question.category` - Still exists for single-edition compatibility
- `question.reference` - Still exists for single-edition compatibility
- These will be populated from the primary/latest edition

**Migration Strategy:**
- Existing questions without `editions` array will be auto-migrated on first edit
- Default to "NEC-2023" edition with existing category/reference
- Templates without `edition` field will default to "NEC-2023"

### Phase 1 Implementation Status

✅ **Completed:**
- Type definitions in `/supabase/functions/server/types.ts`
- `NEC_EDITIONS` constant array
- `QuestionEdition` interface
- `NecEdition` type
- Updated `Question` interface with `editions` array
- Updated `ExamTemplate` interface with `edition` field
- Updated `QuestionForm` and `TemplateForm` types
- Created `/EDITION-UI-MOCKUP.md` with UI design

🔄 **Next Steps (Phase 2):**
- Update QuestionDialog UI with edition checkboxes
- Update form handling to build `editions` array
- Update server question selection logic
- Add edition badges to question cards
- Update ExamTemplateDialog with edition dropdown

### Related Documentation

- See `/EDITION-UI-MOCKUP.md` for detailed UI mockups and user workflows
- See `/supabase/functions/server/types.ts` for complete type definitions

---

## 📐 Database Schema & Type Definitions

**Completed: Sunday, October 26, 2025**  
**Validation Schemas Fixed: Monday, October 27, 2025**  
**Comment Type Safety Fixed: Friday, October 31, 2025**

All type definitions now match the actual database format. This section documents the correct structure.

### Question Format

Questions in the database use this exact structure:

```json
{
  "id": "question:1758292125408-mevallqzz",
  "question": "What size overcurrent protection is required...",
  "options": ["15 amperes", "20 amperes", "25 amperes", "30 amperes"],
  "correctAnswer": 0,
  "category": "NEC 2023",
  "reference": "240.4(D)(3)",
  "difficulty": "Easy",
  "status": "Final",
  "createdAt": "2025-09-19T14:28:45.408Z",
  "updatedAt": "2025-10-19T01:41:02.113Z"
}
```

**TypeScript Interface:**
```typescript
interface Question {
  id: string;                   // Format: "question:timestamp-random"
  question: string;             // The question text
  options: string[];            // Array of answer choices
  correctAnswer: number;        // Index of correct answer (0-3)
  category: string;
  reference?: string;           // Code reference (e.g., "240.4(D)(3)")
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  status?: 'Draft' | 'Final';
  createdAt?: string;           // ISO timestamp
  updatedAt?: string;           // ISO timestamp
}
```

**Key Points:**
- ✅ Use `question` field (NOT `text`)
- ✅ Use `options` field (NOT `answers`)
- ✅ Use `correctAnswer` as number (NOT `correctAnswerIds` string array)
- ✅ Questions are indexed 0-3 (A-D in UI)

### Answer Format

Exam answers are stored in simple numeric format:

```json
{
  "answers": {
    "question:1758292125408-abc": 2,
    "question:1758292125409-xyz": 0,
    "question:1758292125410-def": 1
  }
}
```

**TypeScript Type:**
```typescript
// In ExamResult and ExamSession
answers: Record<string, number>  // questionId -> answer index (0-3)
```

**Key Points:**
- ✅ Simple format: `questionId -> number`
- ✅ Number represents index in options array (0 = A, 1 = B, etc.)
- ❌ Do NOT use rich Answer objects (defined but not used in production)

### Files Updated (October 26, 2025):
- ✅ `/supabase/functions/server/types.ts` - Question interface (Single Source of Truth)
- ✅ `/supabase/functions/server/index.tsx` - Server question parsing (lines 1132-1179)
- ✅ `/components/admin/dialogs/QuestionViewDialog.tsx` - Admin question display
- ✅ `/components/optimized/VirtualizedQuestionList.tsx` - Question list
- ✅ `/components/DemoExam.tsx` - Demo exam display

### Validation Schemas Updated (October 27, 2025):
- ✅ `/schemas/api-validation.ts` - Updated QuestionSchema, removed QuestionAnswerSchema
- ✅ `/utils/type-consistency.ts` - Updated testQuestionType() with correct sample data

**Impact:**
- ✅ Validation now matches database reality
- ✅ Type consistency tests use correct format
- ✅ API documentation is accurate
- ✅ `QuestionAnswer` interface completely eliminated

### Comment Format (Updated November 1, 2025)

Comments in the database support nullable `examId` and `questionId` fields:

```typescript
interface Comment {
  id: string;                   // Format: "1756691891290-e6p5rn0aa"
  examId: string | null;        // Can be null for general comments
  questionId: string | null;    // Can be null for exam-wide comments
  userId: string;               // Supabase UUID
  content: string;
  category: CommentCategory;
  disposition: CommentDisposition;
  createdAt: string;
  updatedAt: string;
  responses: CommentResponse[];
  metadata?: Record<string, any>;
  
  // Runtime-populated fields (added during enriched queries)
  context?: 'during_exam' | 'after_exam';
  needs_attention?: boolean;
  
  // Legacy backward compatibility
  comment?: string;  // Use 'content' instead
  
  // User/Question enrichment fields (not stored, computed on read)
  userEmail?: string;
  userName?: string;
  questionText?: string;
  questionCategory?: string;
}
```

**Key Points:**
- ✅ `examId` and `questionId` are **nullable** - server creates with `|| null`
- ✅ `content` is the primary field (legacy `comment` field supported for backward compatibility)
- ✅ `context` and `needs_attention` are added at runtime during queries
- ✅ Always check for null before accessing `examId` or `questionId`

**Type Safety Fixes Applied (October 31, 2025):**
- ✅ `/supabase/functions/server/types.ts` - Updated Comment interface with nullable fields
- ✅ `/components/admin/sections/CommentsSection.tsx` - Removed unsafe `any` casts, added null checks

**Frontend Best Practices:**
```typescript
// ✅ Correct - Check for null before use
{item.questionId && (
  <Button onClick={() => handleViewQuestion(item.questionId!)}>
    View Question
  </Button>
)}

// ✅ Correct - No unsafe cast needed
const text = 'content' in item ? (item.content || item.comment) : item.comment;

// ❌ Wrong - Assumes questionId is always present
<Button onClick={() => handleViewQuestion(item.questionId)}>
```

**Comment Storage Architecture:**

**Clean Architecture - Standalone Comments Only** (Updated: Saturday, November 1, 2025)

All comments are now standalone entities stored with multiple index keys for efficient querying:

- **Storage Keys:**
  - `comment:{id}` - Main storage
  - `comment:category:{category}:{id}` - Index by category
  - `comment:disposition:{disposition}:{id}` - Index by disposition
  - `comment:userId:{userId}:{id}` - Index by user
  - `comment:questionId:{questionId}:{id}` - Index by question
  - `comment:examId:{examId}:{id}` - Index by exam session
  
- **ID Format:** `"1756691891290-e6p5rn0aa"` (timestamp-random)

- **Comment Categories (User-Selectable):**
  - `Uncategorized` (default)
  - `Spelling`
  - `Flawed Logic`
  - `Poor Structure`
  - `Other` (legacy only - for backward compatibility with old embedded comments)

- **Comment Validation:**
  - **Minimum:** None (any non-empty comment accepted)
  - **Maximum:** 250 characters
  - Frontend shows real-time character count: `X/250`
  - Save button disabled only when empty or over limit
  - Simple, user-friendly validation

- **Unified Comment Flow (During + After Exam):**
  
  **Both During and After Exam use identical Comment entities with same structure and statuses**
  
  **During Exam:**
  1. User clicks "Comment" button while taking exam
  2. Dialog opens with category selector (optional) and text area
  3. Comment is stored **locally** (no API call - timer keeps running)
  4. User continues exam without interruption
  5. When user clicks "Submit Exam", all comments are batch-created as Comment entities
  6. All comments auto-flagged with `disposition: "Under Review"`
  7. User-selected category is preserved (defaults to "Uncategorized")
  
  **After Exam (Review Mode):**
  1. User clicks "Comment" button in Answer Review screen
  2. Same dialog with category selector and text area (identical UI)
  3. Comment is submitted **immediately** to server as new Comment entity
  4. Same `disposition: "Under Review"` as during-exam comments
  5. Allows multiple comments per question (each is a separate entity)
  6. Dialog clears after save for fresh entry
  7. User can add unlimited comments during review
  
  **Multiple Comments on Same Question:** ✅ Fully Supported
  - Each comment is a separate database entity
  - Users can comment during exam AND after exam on same question
  - All comments preserved with context metadata (`during_exam` vs `exam_review`)
  - Admin sees all comments in unified view with single status system
  
  **Comment Disposition Values (Unified for Both During + After):**
  - `Under Review` - Default for all new comments
  - `Needs Attention` - Admin marked as requiring action
  - `Problem Solved` - Issue addressed
  - `Archived` - Hidden from default view
  
  **Admin UI Features:**
  - Category displayed as purple badge on each comment card
  - Filter by category dropdown (All Categories, Uncategorized, Spelling, Flawed Logic, Poor Structure)
  - Filter by disposition/status dropdown
  - Category shown in management dialog
  - Category visible in both During and After Exam tabs
  
- **CRUD Operations:**
  - ✅ **CREATE** - Via exam submission or admin panel
  - ✅ **READ** - Full querying by any index
  - ✅ **UPDATE** - Change disposition, add admin responses, update content
  - ✅ **ARCHIVE** - Soft delete by changing disposition to "Archived"
  
- **No Legacy Comments:**
  - All embedded comment code removed
  - ExamResult interface has NO `questionComments` field
  - Clean, uniform comment system
  - Cleanup endpoints removed (no longer needed)

---

## 🛠️ VSCode Setup for TypeScript Development

**Added: Sunday, October 26, 2025**

This project runs in Figma Make (web-based IDE) but can be edited in VSCode with proper configuration:

### Setup Steps:
1. **Install Dependencies** (for type checking only - Figma Make bundles everything automatically):
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```
   
   **⚠️ IMPORTANT**: You MUST run this command in your project root directory!
   This creates the `node_modules/` folder with React types that VSCode needs.

2. **Reload VSCode Window** (after installing):
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Reload Window" and select "Developer: Reload Window"
   - Or just close and reopen VSCode

3. **VSCode Will Now Recognize**:
   - ✅ React imports and hooks
   - ✅ TypeScript types from `/supabase/functions/server/types.ts`
   - ✅ Component imports with IntelliSense
   - ✅ Type guards and type safety checks

4. **Type Checking** (optional):
   ```bash
   npm run type-check
   ```

### How React Imports Work:
- **In Figma Make**: Dependencies are auto-bundled, no `node_modules` needed
- **In VSCode**: Uses `package.json` + `tsconfig.json` for IntelliSense only
- **Import syntax**: Standard ESM imports work everywhere:
  ```typescript
  import { useState, useEffect } from "react";
  import type { Question, Comment } from "./supabase/functions/server/types";
  ```

### Files Added:
- `/tsconfig.json` - TypeScript compiler configuration
- `/package.json` - Dependency declarations (for VSCode IntelliSense)
- `/.vscode/settings.json` - VSCode-specific settings

### Important Notes:
- **Don't commit `node_modules/`** - It's only for local VSCode type checking
- **Figma Make is the source of truth** - Always test there before committing
- **Protected files** still cannot be edited (listed in `tsconfig.json` exclude)

### 🔧 Troubleshooting VSCode Setup

**Problem: "Cannot find module 'react' or its corresponding type declarations"**

**Solution:**
1. **Verify you're in the project root directory**:
   ```bash
   pwd  # Should show your project directory
   ls   # Should show package.json, tsconfig.json, App.tsx, etc.
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```
   This should create a `node_modules` folder with ~300+ MB of dependencies.

3. **Verify installation**:
   ```bash
   ls node_modules/react        # Should show react package
   ls node_modules/@types/react # Should show TypeScript types
   ```

4. **Reload VSCode**:
   - Close all files
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows)
   - Type "Reload Window" and press Enter
   - Or restart VSCode completely

5. **Check TypeScript version**:
   - Look at bottom-right of VSCode (should show "TypeScript 5.5.x")
   - If it shows different version, click it and select "Use Workspace Version"

6. **Still not working?**
   - Delete `node_modules/` and reinstall: `rm -rf node_modules && npm install`
   - Check you have Node.js 18+ installed: `node --version`
   - Try opening just the root folder in VSCode (not a parent folder)

**Problem: "Import errors" or "Module not found"**

**Solution:** Make sure imports use relative paths exactly as shown:
```typescript
// ✅ Correct - relative path from file location
import type { Question } from "../supabase/functions/server/types";
import { Button } from "./ui/button";

// ❌ Wrong - absolute paths don't work
import type { Question } from "/supabase/functions/server/types";
```

**Problem: "Type errors in node_modules"**

**Solution:** Run type check to see actual project errors:
```bash
npm run type-check
```
Ignore errors in `node_modules/` - those are from third-party packages.

---

## 📝 Rich Text Editor Standards

**Implemented: Tuesday, October 28, 2025**

### ✅ Standard: Jodit Editor

This project uses **Jodit** (`jodit-react`) as the standard rich text editor for all WYSIWYG editing needs.

**DO NOT use ReactQuill** - it has CSS specificity issues with our theme system that make toolbar icons invisible.

### Usage Example:

```typescript
import { useRef, useMemo } from 'react';
import JoditEditor from 'jodit-react';

const MyComponent = () => {
  const editor = useRef(null);
  
  const config = useMemo(() => ({
    readonly: false,
    placeholder: 'Enter text...',
    minHeight: 200,
    buttons: ['bold', 'italic', 'underline', '|', 'ul', 'ol', '|', 'link', '|', 'undo', 'redo'],
    toolbarAdaptive: false,
    showCharsCounter: false,
    showWordsCounter: false,
    showXPathInStatusbar: false,
  }), []);
  
  return (
    <JoditEditor
      ref={editor}
      value={content}
      config={config}
      onBlur={(newContent) => setContent(newContent)}
    />
  );
};
```

### Theme Integration:

The Jodit editor is fully integrated with our theme system via `/styles/globals.css`:
- ✅ Works in both light and dark modes
- ✅ Uses CSS variables (`--foreground`, `--background`, `--border`)
- ✅ Toolbar buttons are visible and properly styled
- ✅ Respects theme transitions

### Configuration Tips:

1. **Keep it simple** - Only include buttons you actually need
2. **Use useMemo** - Prevent unnecessary re-renders by memoizing config
3. **Disable extras** - Turn off char counters, status bars, XPath display
4. **Responsive buttons** - Use `buttons`, `buttonsMD`, `buttonsSM`, `buttonsXS` for different screen sizes

### Files Reference:
- `/components/admin/dialogs/ExamTemplateDialog.tsx` - Production example
- `/styles/globals.css` - Theme styling (lines 328-376)

### Why Jodit?

- ✅ Reliable toolbar that works out of the box
- ✅ Better TypeScript support
- ✅ Excellent theme compatibility
- ✅ Built-in undo/redo
- ✅ Simpler configuration than ReactQuill
- ✅ No CSS specificity battles

**Lesson:** Use established, well-supported libraries. Don't fight with custom configurations.

---

## ⏸️ Exam Tour Timer Behavior

**Implemented: Wednesday, October 29, 2025**

The exam timer **automatically pauses** during the guided tour to ensure users don't lose exam time while learning the interface.

### User Flow:

1. **User starts exam** → Timer begins counting down
2. **User clicks "Take the Tour"** → Timer PAUSES (⏸️)
3. **User goes through 8 tour steps** → Timer remains paused
4. **User clicks "Finish Tour"** → Timer RESUMES (▶️)
5. **User takes exam** → Full time available

### Implementation Details:

**Timer Control:**
- Uses existing `pauseTimer()` and `resumeTimer()` from `useExamTimer` hook
- `tourInProgress` state tracks when tour overlay is active
- Pause/resume logic in `ExamTakingView.tsx` handlers:
  - `handleTourStart()` → Pauses timer
  - `handleTourExit()` → Resumes timer

**Visual Indicator:**
- Timer display shows "(Paused)" text in yellow when paused
- Subtle pulsing dot indicator on clock icon
- Theme-aware styling (works in light/dark mode)

**Files Modified:**
- `/components/exam/views/ExamTakingView.tsx` - Tour state and timer pause/resume logic
- `/components/ExamInterface.tsx` - Timer display with pause indicator
- `/hooks/useExamTimer.ts` - Already had pause/resume functionality

### Why This Matters:

❌ **Before Fix:** User who spent 3 minutes on tour would lose 3 minutes of exam time  
✅ **After Fix:** User gets full exam duration regardless of tour time

**Related:** The tour is shown only for first-time users. Returning users who previously dismissed the tour will see the exam interface immediately without the tour prompt.

---

## 🔑 Database Key Standards

**Status: 🎉 PHASE 2 COMPLETE**

### Current Guideline (Actively Enforced):

**RULE: Use Keys/KeyPatterns helpers instead of string concatenation**

**Progress:**
- ✅ Phase 1: Infrastructure complete (5 helpers added)
- ✅ Phase 2: User Feedback section (5 instances) - COMPLETE
- ✅ Phase 2: Questions section (9 instances) - COMPLETE
- ✅ Phase 2: Comments section (8 instances) - COMPLETE
- ✅ Phase 2: Templates section (5 instances) - COMPLETE
- ✅ Phase 2: Results section (6 instances) - COMPLETE
- ✅ Phase 2: Users section (4 instances) - COMPLETE
- ✅ Phase 2: Categories section (2 instances) - COMPLETE
- ✅ Phase 2: Utility functions (3 instances) - COMPLETE

**Total:** 42/42 instances complete (100%) 🎉

### ✅ DO:

```typescript
// Individual entity keys
const question = await kv.get(Keys.question(questionId));
const template = await kv.get(Keys.template(templateId));
const userProfile = await kv.get(Keys.userProfile(userId));

// Query/index keys
const allQuestions = await kv.getByPrefix(KeyPatterns.allQuestions());
const userComments = await kv.getByPrefix(KeyPatterns.allCommentsForUser(userId));

// Composite index keys
const commentKey = Keys.commentsByQuestion(questionId, commentId);
```

### ❌ DON'T:

```typescript
// Manual string concatenation (anti-pattern)
const question = await kv.get(`question:${questionId}`);
const allQuestions = await kv.getByPrefix('question:');
const commentKey = `comment:questionId:${questionId}:${commentId}`;
```

### Why This Matters:

1. **Type Safety** - TypeScript catches typos at compile time
2. **Consistency** - One source of truth for key formats
3. **Refactoring Safety** - Change key format in one place
4. **Discoverability** - All keys visible in `/supabase/functions/server/keys.ts`
5. **Validation** - Can add format validation in helpers
6. **Migration Support** - Centralized fallback logic for old formats

### Current State:

✅ **All database key operations** now use the Keys/KeyPatterns infrastructure from `/supabase/functions/server/keys.ts`.

### Adding New Entity Types:

When adding a new entity type to the database:

1. Add to `Keys` object in `/supabase/functions/server/keys.ts`
2. Add to `KeyPatterns` for query prefixes
3. Add to this documentation
4. **Use the helpers immediately** in all operations (no string concat)

**Example:**
```typescript
// In keys.ts
export const Keys = {
  // ... existing keys
  myNewEntity: (id: string) => `my-entity:${id}`,
};

export const KeyPatterns = {
  // ... existing patterns
  allMyEntities: () => 'my-entity:',
};

// In index.tsx
const entity = await kv.get(Keys.myNewEntity(entityId));
const allEntities = await kv.getByPrefix(KeyPatterns.allMyEntities());
```

### ⚠️ Critical: getByPrefixWithFallback Must Merge Results

**BUG FIXED: Saturday, November 1, 2025**

The `getByPrefixWithFallback()` helper had a critical flaw where it only searched the old prefix if the new prefix returned ZERO results. This caused massive data loss during migration.

**❌ BROKEN LOGIC (Before Fix):**
```typescript
let items = await kv.getByPrefix(newPrefix);
if (items.length === 0 && oldPrefix) {
  items = await kv.getByPrefix(oldPrefix);  // Only if new prefix is empty!
}
return items;
```

**Problem:** If you had:
- 4 results with `result:` prefix (new format)
- 100 results with `exam-result:` prefix (old format)

The function would return only the 4 new ones and **ignore the 100 old ones completely**.

**✅ FIXED LOGIC (After Fix):**
```typescript
const newItems = await kv.getByPrefix(newPrefix);
const oldItems = await kv.getByPrefix(oldPrefix);
const allItems = [...newItems, ...oldItems];
// Deduplicate by key
return uniqueItems;
```

**Impact:** All 104 exam results now show correctly in admin panel.

**Files Fixed:**
- `/supabase/functions/server/keys.ts` - Lines 273-303

### ⚠️ Critical: Using `mset` Correctly

**IMPORTANT:** The `kv.mset()` function requires **two separate arrays** (keys and values), NOT an array of tuples!

**✅ CORRECT:**
```typescript
const keys = [
  Keys.comment(commentId),
  Keys.commentsByCategory('Other', commentId),
  Keys.commentsByUser(userId, commentId)
];

const values = [
  comment,
  comment,
  comment
];

await kv.mset(keys, values);
```

**❌ WRONG:**
```typescript
// This will cause "Cannot read properties of undefined" error!
const keysToSet = [
  [Keys.comment(commentId), comment],
  [Keys.commentsByCategory('Other', commentId), comment]
];

await kv.mset(keysToSet); // ❌ mset expects (keys[], values[]), not [[key, value]]
```

**Why this matters:** The error happens because `mset` tries to access `values[i]` where `values` is actually the nested array structure, causing `values[i]` to be `undefined` for most indices.

**Fixed:** Saturday, November 1, 2025 - Exam submission comment creation bug (line 1220-1240 in `/supabase/functions/server/index.tsx`)

---

## 📦 Comment Archive System

**Implemented: Friday, October 31, 2025**

### Archive vs Delete Philosophy

In production, **archiving** is preferred over deleting user feedback:
- ✅ Preserves comments for historical analysis
- ✅ Reversible (can unarchive if needed)
- ✅ Maintains data integrity
- ✅ Allows trend analysis over time

### How Archiving Works

**For Standalone Comments** (✅ Supported):
1. Changes `disposition` field to `'Archived'`
2. Updates all database index keys
3. Adds `archivedAt` timestamp and `archivedBy` metadata
4. Hidden from default view (GET endpoint filters out)
5. Visible with `?showArchived=true` query parameter

**For Embedded Comments** (❌ Not Supported):
- Cannot be archived (stored as simple strings)
- Shows "Legacy Format" badge in UI
- Archive button is disabled with explanatory tooltip
- Need migration to standalone format for archiving

### UI Features

- **Show Archived Toggle**: Checkbox to view archived comments
- **Status Filter**: Can filter by "Archived" disposition
- **Colored Buttons**: 
  - 🔵 Blue "Manage" button (update disposition/add notes)
  - 🔴 Red "Archive" button (soft delete)
- **Legacy Badge**: Yellow badge for embedded comments
- **Tooltips**: Explain why archive is disabled for legacy comments

### Files Modified:
- `/supabase/functions/server/types.ts` - Added 'Archived' to CommentDisposition type
- `/supabase/functions/server/index.tsx` - DELETE endpoint now archives (lines 2937-3005)
- `/components/admin/sections/CommentsSection.tsx` - UI with colored buttons, archive toggle, legacy badges
- `/hooks/useAdminApi.ts` - Added showArchived parameter to getAll()

---

## 📊 Question Comment Statistics

**Implemented: Saturday, October 25, 2025**

The QuestionViewDialog now displays comment statistics in the "Metadata & Stats" tab to help identify problematic questions:

### Features:
- **Total Comments Count**: Shows all comments (during + after exam) for a question
- **During Exam Count**: Comments submitted while taking the exam (Comment type)
- **After Exam Count**: Feedback submitted during exam review (UserFeedback type)
- **Needs Attention Count**: Comments marked as "Needs Attention" or "pending"

### Usage:
- Admin clicks question link from CommentsSection → Opens QuestionViewDialog
- Navigate to "Metadata & Stats" tab
- View comment statistics card showing all counts
- Helps identify questions receiving lots of user feedback (indicates potential issues)

### Files Modified:
- `/components/admin/dialogs/QuestionViewDialog.tsx` - Added comment statistics state and display
- Added `loadCommentStats()` function to fetch comments for a specific question
- Displays stats in new "Comment Statistics" card

### Server Endpoint:
- **Endpoint**: `GET /admin/questions/:id/comments`
- **Purpose**: Fetch all comments (both types) for a specific question
- **Returns**: Unified array of Comment + UserFeedback with `context` and `needs_attention` flags

---

## 📊 Exam Results & Status System

**Simplified: Saturday, November 1, 2025**

The exam results system uses a simplified 3-status filter to show only submitted exams.

### Core Principle: Results = Submitted Exams Only

**An exam must be submitted to be a "result"**. In-progress or not-started exams are NOT results.

**Submission triggers:**
1. ⏱️ **Timer expires** - Exam auto-submits for scoring (even with unanswered questions)
2. ✅ **User clicks "Submit Exam"** - Exam submits for scoring (even with time remaining)

This mirrors real-world exam behavior where time limits are enforced.

### Status Filter Options (3 Total):

| Filter | Logic | Description |
|--------|-------|-------------|
| **All Results** | `submittedAt` exists | All submitted exams (passed + failed) |
| **Passed** | `submittedAt` exists AND `percentage >= 70` | Submitted with passing score |
| **Failed** | `submittedAt` exists AND `percentage < 70` | Submitted with failing score |

### What We Removed:

❌ **"In Progress"** - Not a result (exam not submitted)  
�� **"Not Started"** - Not a result (no answers recorded)  
❌ **"Abandoned"** - Same as "In Progress" (redundant)  
❌ **"Completed"** - Ambiguous (replaced by Passed/Failed)

### ExamSession Interface (Consolidated)

**Single Source of Truth:** `/supabase/functions/server/types.ts`

```typescript
export interface ExamSession {
  id: string;                   // Format: "1756691891290-e6p5rn0aa"
  userId: string;
  templateId: string;
  title?: string;               // Exam title for display
  questions: Question[];
  answers: Record<string, number>;  // questionId -> answer index (0-3)
  startTime: string;
  timeLimit: number;            // seconds
  status: 'in_progress' | 'completed' | 'abandoned';
  
  // Frontend state fields for UI (optional)
  currentQuestionIndex?: number;
  comments?: Record<string, string>;
  flags?: Record<string, boolean>;
  bookmarks?: Record<string, boolean>;
  eliminatedAnswers?: Record<string, Set<number>>;
}
```

**Key Changes:**
- ✅ Removed duplicate interface from `/components/exam/ExamManager.tsx`
- ✅ Import from types.ts: `import type { ExamSession } from '../../supabase/functions/server/types'`
- ✅ Consolidated frontend-specific fields into single interface
- ✅ Consistent camelCase field names throughout

### Server Endpoint Behavior:

**`GET /admin/results`** - Returns only submitted exam results
- ✅ Fetches from `result:` and `exam-result:` prefixes (completed exams)
- ❌ Does NOT fetch from `session:` or `exam-session:` prefixes (in-progress exams)
- Each result has `completedAt` timestamp (mapped to `submittedAt` in response)
- This ensures the Results section only shows actual results

**In-Progress Exam Sessions:**
- Stored with `session:` prefix in database
- NOT shown in Results section (by design)
- If admin needs to view active sessions, a separate "Sessions" section can be added later
- Sessions become Results when submitted (new `result:` entry created)

### Data Flow:

1. **User starts exam** → Server creates `session:{id}` entry
2. **User takes exam** → Session updated with answers
3. **Timer expires OR Submit clicked** → Server creates `result:{id}` entry AND deletes session
4. **Admin views Results** → Endpoint fetches only `result:*` entries
5. **All 104 items shown** → All are submitted results (not mixed with sessions)

### Session Lifecycle & Cleanup:

**Automatic Cleanup (Saturday, November 1, 2025):**
- ✅ When exam is submitted → Session is automatically deleted (line 1281-1296 in server/index.tsx)
- ✅ Session cleanup happens for BOTH new (`session:`) and old (`exam-session:`) formats
- ✅ Prevents zombie sessions from accumulating in database

**Manual Cleanup (Admin Sessions Section):**
- Admin can view all active and stale sessions
- **Stale Session Definition:** Age > (expected duration + 30 min) OR > 4 hours
- Bulk cleanup endpoint: `POST /admin/sessions/cleanup-stale`
- Individual session deletion: `DELETE /admin/sessions/:id`

**Why Sessions Become Stale:**
1. ❌ User closes browser/tab without submitting (session abandoned)
2. ❌ App crash/error before submission completes
3. ❌ Network interruption during exam
4. ❌ Historical sessions from before cleanup logic was added

**New Admin Endpoints:**
- `GET /admin/sessions` - Fetch all sessions with age calculation
- `DELETE /admin/sessions/:id` - Delete specific session
- `POST /admin/sessions/cleanup-stale` - Bulk delete sessions older than threshold

### Files Modified:
- `/supabase/functions/server/types.ts` - Enhanced ExamSession with frontend fields
- `/supabase/functions/server/index.tsx` - Results endpoint now excludes sessions (line 2234-2242)
- `/components/exam/ExamManager.tsx` - Removed duplicate interface, imports from types.ts
- `/components/admin/sections/ResultsSection.tsx` - Simplified to 3-status filter, shows only submitted exams
- `/Guidelines.md` - Documented new status system and server behavior

## 📊 Exam Results & Review Features

**Implemented: Wednesday, October 22, 2025**

The exam results page now includes comprehensive post-exam actions:

### Features:
- **Review Answers Button**: Opens interactive review mode showing:
  - Correct/incorrect answer indicators with green/red highlighting
  - User's selected answer vs. correct answer comparison
  - Question explanations (when available)
  - Filter by: All, Correct, Incorrect, Skipped questions
  - Two-pane layout with question index sidebar
  - Navigation between questions with Previous/Next buttons
  
- **Print Results Button**: Opens browser print dialog for physical records
  
- **Download Results Button**: Downloads text file with:
  - Exam title and completion timestamp
  - Score summary (percentage, correct/incorrect breakdown)
  - Completion rate and accuracy statistics
  - Formatted filename: `exam-results-{exam-name}-{date}.txt`

### Files Created/Modified:
- `/components/exam/views/ExamReviewView.tsx` - New comprehensive review interface
- `/components/exam/views/ExamResultsView.tsx` - Added Review/Print/Download buttons
- `/components/exam/ExamManager.tsx` - Added 'review' view routing and state management

## 💾 Answer Auto-Save Behavior (Navigation-Triggered)

**Implemented: Wednesday, October 22, 2025**

The exam interface uses **Option 3: Navigation-Triggered Auto-Save** to match commercial platform UX:

- **Radio Selection**: Clicking a radio button selects the answer (updates `selectedAnswer` state)
- **Explicit Submit**: "Submit Answer" button saves the answer and advances to next question
- **Auto-Save on Navigation**: If user navigates (Previous/Next/Click question in Index) without clicking Submit:
  - Selected answer is automatically saved
  - Subtle toast notification appears: "Answer saved"
  - Prevents data loss while maintaining intentional workflow
- **State Tracking**: System distinguishes between "selected but not submitted" vs "submitted" answers

**Files Modified:**
- `/components/exam/views/ExamTakingView.tsx` - Added `handleQuestionChange` wrapper with auto-save logic
- Imports `toast` from `sonner@2.0.3` for subtle notifications

## 🛡️ CRITICAL: Template/Question ID Prefix Handling

**ALWAYS strip prefixes when doing lookups!**

Old data has prefixes like `exam-template:`, `template:`, `question:`. New data uses clean IDs.  
**Solution:** Always use `.split(':').pop()` before Map/database lookups to handle both formats.

### Recent Fixes:
- ✅ **QuestionViewDialog** (Oct 19, 2025): Added prefix stripping to question lookup in Comments section
  - File: `/components/admin/dialogs/QuestionViewDialog.tsx` line 99
  - Issue: "Question not found" when clicking question link from comment cards
  - Fix: `const cleanQuestionId = questionId.split(':').pop() || questionId;`

## 🧪 Type Safety Testing

**Implemented: Saturday, November 1, 2025**

We now have comprehensive type safety testing infrastructure to ensure API responses match TypeScript types and Zod schemas stay aligned.

### Testing Tools:

1. **`/test-api-types.ts`** - Runtime API Response Validation
   - Calls actual API endpoints
   - Validates responses against TypeScript interfaces
   - Checks nullable field handling
   - Reports type mismatches

2. **`/test-zod-alignment.ts`** - Schema Alignment Checker
   - Compares Zod schemas with TypeScript types
   - Validates enum value consistency
   - Checks optional field alignment
   - Reports schema drift

3. **`/TESTING-TYPE-SAFETY.md`** - Complete Testing Guide
   - How to run tests
   - How to interpret results
   - How to fix common issues
   - Best practices for adding new types

### Key Fixes Applied:

**Comment Schema Updates:**
- ✅ `examId` and `questionId` now properly typed as nullable: `z.string().nullable()`
- ✅ Comment categories aligned with TypeScript: `['Uncategorized', 'Spelling', 'Flawed Logic', 'Poor Structure', 'Other']`
- ✅ Comment dispositions updated to include `'Archived'`
- ✅ Added runtime fields: `context` and `needs_attention`

**Files Updated:**
- `/schemas/api-validation.ts` - Fixed nullable fields and enum values
- `/test-api-types.ts` - Created comprehensive runtime validation suite
- `/test-zod-alignment.ts` - Created schema alignment checker
- `/TESTING-TYPE-SAFETY.md` - Complete testing documentation

### Running Tests:

**In Figma Make (Web UI - Recommended):**
1. Log in to the admin area
2. Navigate to "Type Safety Testing" in the left sidebar
3. Click "Run All Tests" or run tests individually
4. View results directly in the UI with color-coded pass/fail indicators

**In Local Development (Terminal):**
```bash
# Check schema alignment (no auth needed)
npx tsx test-zod-alignment.ts

# Test actual API responses (requires admin token)
npx tsx test-api-types.ts
```

### When to Run:

- ✅ After adding/modifying TypeScript interfaces
- ✅ After updating Zod schemas
- ✅ Before committing type changes
- ✅ In CI/CD pipeline
- ✅ When investigating type-related bugs

### Success Criteria:

1. ✅ All Zod schemas accept data matching TypeScript types
2. ✅ Nullable fields consistently typed with `| null` and `.nullable()`
3. ✅ Optional fields consistently typed with `?:` and `.optional()`
4. ✅ Enum values match between Zod and TypeScript
5. ✅ API responses pass both TypeScript and Zod validation

See `/TESTING-TYPE-SAFETY.md` for complete testing guide.

### Recent Fixes:

**ExamTemplate validation failures (November 1, 2025):**
- ✅ **FIXED**: `template_name` and `updatedAt` are now properly marked as optional
- These fields are not present on all templates in the database
- TypeScript interface updated: `template_name?: string` and `updatedAt?: string`
- Zod schema updated: `.optional()` added to both fields
- Test validation schema updated to expect `string | undefined`

**Impact:**
- ✅ Type Safety Testing now passes for ExamTemplate endpoints
- ✅ No more false positives for missing optional fields
- ✅ Schemas accurately reflect database reality

### Common Issues:

**"Failed to fetch" on all endpoints:**
- ✅ **FIXED (November 1, 2025)**: TypeSafetyTestingSection now uses dynamic `projectId` instead of hardcoded URL
- The component imports `projectId` from `'../../../utils/supabase/info'`
- Server URL is constructed as: `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165`
- This ensures tests work in any Figma Make environment

**If tests still fail:**
1. Verify you're logged in to admin area
2. Check access token is valid (log out and back in)
3. Open browser DevTools > Network tab to see actual errors
4. Check server is running and accessible

See `/TYPE-TESTING-FIX.md` for detailed fix documentation.

---

## ✅ Server Keys Infrastructure - APPLIED

**All database operations MUST use Keys infrastructure:**
- ✅ Templates: Use `Keys.template(id)` and `KeyPatterns.allTemplates()`
- ✅ Questions: Use `Keys.question(id)` and `KeyPatterns.allQuestions()`
- ✅ Comments: Use `Keys.comment(id)` and `KeyPatterns.allComments()`
- ✅ Testing Feedback: Use `Keys.testingFeedback(id)` and `KeyPatterns.allTestingFeedback()`
- ✅ Changelog: Use `Keys.changelog(id)` and `KeyPatterns.allChangelog()`

**NEVER use manual string concatenation like `'testing-feedback:'` or `'template:'`**

See `/supabase/functions/server/keys.ts` for all available Keys and KeyPatterns.

## 🎯 Template Display Order

**Drag-and-drop ordering is now fully functional:**
- Admin can reorder templates via drag-and-drop in ExamTemplatesSection
- Order persists across page refreshes (stored as `displayOrder`/`display_order`)
- ✅ Admin UI uses direct fetch to avoid blocking "Loading..." screen (non-blocking background save)
- ✅ User-facing ExamSelectionView respects admin's custom order
- Falls back to alphabetical sorting if no displayOrder is set

---

## 🔌 Admin API Patterns

**Implemented: Saturday, November 1, 2025**

All admin sections MUST use the `useAdminApi` hook for server communication instead of hardcoding endpoints.

### ✅ Correct Pattern:

```typescript
import { useAdminApi } from "../../../hooks/useAdminApi";
import type { AdminExamSession } from "../../../supabase/functions/server/types";

export const MySection = ({ accessToken }: Props) => {
  const { myEntityApi, isLoading } = useAdminApi(accessToken);
  const [items, setItems] = useState<MyEntity[]>([]);

  const loadItems = async () => {
    const result = await myEntityApi.getAll();
    if (result.success && result.data) {
      setItems(result.data);
    } else {
      toast.error(result.error || 'Failed to load items');
    }
  };

  const handleDelete = async (id: string) => {
    const result = await myEntityApi.delete(id);
    if (result.success) {
      toast.success('Deleted successfully');
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  useEffect(() => {
    loadItems();
  }, [accessToken]);
};
```

### ❌ Wrong Pattern:

```typescript
// ❌ Don't hardcode endpoints in components
const loadItems = async () => {
  const response = await fetch(
    'https://pfgumghtpcajqnwygdqw.supabase.co/functions/v1/make-server-a9be5165/admin/items',
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );
  const result = await response.json();
  setItems(result.data);
};
```

### Why This Matters:

1. **Centralized Configuration** - Server URL defined once in `useAdminApi`
2. **Type Safety** - Return types defined in hook
3. **Consistent Error Handling** - Hook handles loading states and errors
4. **Easy Testing** - Mock the hook instead of fetch calls
5. **DRY Principle** - No repeated endpoint URLs across components

### Adding New API Methods:

When adding a new admin section, add its API methods to `/hooks/useAdminApi.ts`:

```typescript
// In useAdminApi.ts
const myNewEntityApi = {
  getAll: () => makeRequest<MyEntity[]>('/admin/my-entities'),
  create: (data: MyEntityForm) => makeRequest('/admin/my-entities', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: MyEntityForm) => makeRequest(`/admin/my-entities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => makeRequest(`/admin/my-entities/${id}`, {
    method: 'DELETE',
  }),
};

return {
  // ... existing APIs
  myNewEntityApi,
};
```

### Available Admin APIs:

- `questionsApi` - Question CRUD operations
- `questionCategoriesApi` - Category management
- `templatesApi` - Exam template operations
- `resultsApi` - Exam results queries
- `commentsApi` - Comment management
- `userFeedbackApi` - User feedback operations
- `sessionsApi` - Session management

### Files:
- `/hooks/useAdminApi.ts` - Admin API hook definition (for `/admin/*` endpoints)
- `/hooks/useUserApi.ts` - User API hook definition (for `/user/*` endpoints)
- `/components/admin/sections/*Section.tsx` - All admin sections use `useAdminApi`
- `/components/ProfilePage.tsx` - User profile uses `useUserApi`

### Hook Separation:

**`useAdminApi`** - Admin-only operations:
- Endpoints under `/admin/*` path
- Requires admin privileges
- Used in admin sections only

**`useUserApi`** - User-scoped operations:
- Endpoints under `/user/*` path
- Requires authentication (any user)
- Used in user-facing components (Profile, Settings, etc.)

**Important:** Never mix admin and user operations in the same hook. This maintains clear separation of concerns and proper naming.

## 🎨 Admin Section Styling Standards

**Implemented: Saturday, November 1, 2025**

All admin sections MUST follow these consistent patterns for headers and layout:

### ✅ Required Pattern:

```tsx
import { AdminSectionHeader } from '../AdminSectionHeader';

export const MySection = ({ accessToken }: Props) => {
  return (
    <div className="p-6 pt-0 space-y-6">
      <AdminSectionHeader
        title="Section Title"
        description="Section description"
      >
        {/* Optional: Action buttons go here as children */}
        <Button onClick={handleAction}>
          <Icon className="h-4 w-4 mr-2" />
          Action
        </Button>
      </AdminSectionHeader>

      {/* Section content goes here */}
    </div>
  );
};
```

### Key Requirements:

1. **Wrapper div**: `className="p-6 pt-0 space-y-6"`
   - `p-6` = padding on all sides
   - `pt-0` = no top padding (AdminSectionHeader has its own spacing)
   - `space-y-6` = vertical spacing between child elements

2. **AdminSectionHeader**: Always use this component, never custom headers
   - Provides sticky header behavior
   - Consistent typography (`text-2xl font-semibold`)
   - Theme-aware styling
   - Built-in theme toggle buttons

3. **Action Buttons**: Pass as `children` to AdminSectionHeader
   - Renders in top-right corner
   - Automatically aligned with title

### ❌ Don't Do This:

```tsx
// ❌ Custom header instead of AdminSectionHeader
<div className="flex items-center justify-between">
  <div>
    <h2 className="text-xl font-medium">Title</h2>
    <p className="text-sm text-muted-foreground">Description</p>
  </div>
</div>

// ❌ Wrong wrapper classes
<div className="space-y-6">  // Missing p-6 pt-0
<div className="p-6 space-y-6">  // Missing pt-0

// ❌ Different text styles
<h2 className="text-2xl font-semibold">  // Use AdminSectionHeader instead
```

### Files Updated (November 1, 2025):
- ✅ `/components/admin/sections/TourManagementSection.tsx` - Added AdminSectionHeader import and usage
- ✅ `/components/admin/sections/TestingFeedbackSection.tsx` - Added AdminSectionHeader import and usage
- ✅ `/components/admin/sections/DataMigrationSection.tsx` - Fixed wrapper div padding
- ✅ `/components/admin/sections/LegacyConfigSection.tsx` - Fixed wrapper div padding

### All Admin Sections Now Consistent:
- ✅ DashboardSection
- ✅ QuestionsSection
- ✅ ExamTemplatesSection
- ✅ QuestionCategoriesSection
- ✅ UserManagementSection
- ✅ ResultsSection
- ✅ CommentsSection
- ✅ TourManagementSection ← Fixed
- ✅ TestingFeedbackSection ← Fixed
- ✅ DataMigrationSection ← Fixed
- ✅ LegacyConfigSection ← Fixed
- ✅ GuidelinesSection
- ✅ ApiValidationSection
- ✅ TypeSafetyTestingSection

---

## 🗑️ Removed Features (YAGNI Applied)

**Updated: Saturday, November 1, 2025**

### API Documentation Section - REMOVED

**Decision:** Removed the auto-generated API documentation viewer from the admin area.

**Reason (YAGNI - You Aren't Gonna Need It):**
- ❌ Never worked correctly (always returned 401 authentication errors)
- ❌ Never actually used in production
- ❌ Duplicate effort - working admin sections already use the API effectively
- ❌ Guidelines.md provides better, human-written documentation
- ❌ Maintenance burden with no benefit

**Files Removed:**
- `/components/admin/sections/ApiDocumentationSection.tsx` - Main UI component
- `/components/admin/sections/ApiDocsDiagnostic.tsx` - Diagnostic tool

**Files Updated:**
- `/components/admin/AdminDashboard.tsx` - Removed import and routing
- `/components/admin/AdminSidebar.tsx` - Removed sidebar item
- `/components/admin/types.ts` - Removed 'api-docs' from AdminSection type

**Server Files (Proposed for Removal):**
- `/supabase/functions/server/documentation.tsx` - Auto-generated docs (unused)
- `/supabase/functions/server/openapi-spec.tsx` - OpenAPI spec generator (unused)

**Lesson Learned:** Don't build "just in case" features. Build what you actually need, when you need it. The existing admin sections that directly interact with the API are far more useful than auto-generated documentation that nobody reads.

---

## 💾 Guidelines.md Automatic Sync

**Implemented: Saturday, November 1, 2025**

The Guidelines.md file automatically syncs to Supabase Storage with one click - no manual copy-paste required.

### How It Works:

**Storage Architecture:**
- **Source**: `/supabase/functions/server/Guidelines.md` (server-accessible copy)
- **Distribution**: `documentation/Guidelines.md` in Supabase Storage (public bucket)
- **Viewer**: Admin > Guidelines section (reads from Supabase Storage)
- **Max size**: 10MB limit

**Auto-Sync Workflow:**
1. AI assistant updates `/Guidelines.md` AND `/supabase/functions/server/Guidelines.md`
2. Admin navigates to Admin > Guidelines section
3. Admin clicks **"Sync to Storage"** button
4. Server reads `/supabase/functions/server/Guidelines.md` using `Deno.readTextFile()`
5. Server uploads to Supabase Storage with upsert (replaces old version)
6. Success toast shows file size and timestamp
7. Click "Refresh" to see updated content in viewer

**Why Two Files:**
- `/Guidelines.md` - Main documentation (user-facing, in project root)
- `/supabase/functions/server/Guidelines.md` - Server-accessible copy (Deno can read it)
- Both files must be kept in sync when AI updates documentation

**Endpoints:**
- `GET /guidelines` - Downloads from Supabase Storage (with fallback)
- `POST /admin/guidelines/sync` - Reads server file and uploads to storage

**Files:**
- `/Guidelines.md` - Main documentation file (project root)
- `/supabase/functions/server/Guidelines.md` - Server copy (NEW)
- `/components/admin/sections/GuidelinesSection.tsx` - Viewer with sync button
- `/supabase/functions/server/guidelines-sync.tsx` - Sync endpoint code

**Benefits:**
- ✅ One-click sync (no copy-paste needed)
- ✅ Server reads file directly from filesystem
- ✅ Cross-environment distribution via Supabase Storage
- ✅ Clear feedback via toast notifications
- ✅ Last sync timestamp displayed
- ✅ Fallback content if storage unavailable

**Important:** AI assistant must update BOTH files when modifying Guidelines.md:
1. `/Guidelines.md` - User-facing version
2. `/supabase/functions/server/Guidelines.md` - Server-accessible copy

---

## 🔐 Persistent Login & Session Management

**Implemented: Sunday, November 2, 2025**

The exam platform now supports persistent login with a "Stay logged in" checkbox on the login page.

### User Experience:

**Login Page:**
- ✅ Checkbox labeled "Stay logged in" (default: unchecked)
- User can choose whether to persist session across browser restarts

**Session Storage:**
- **Checkbox CHECKED (Stay logged in)**: Session stored in `localStorage`
  - Persists across browser sessions (until user logs out)
  - Survives browser restarts
  - Ideal for personal devices
  
- **Checkbox UNCHECKED (default)**: Session stored in `sessionStorage`
  - Cleared when browser/tab closes
  - More secure for shared/public computers
  - Requires re-login after closing browser

### Implementation Details:

**Storage Format:**
```typescript
{
  accessToken: string;
  userProfile: any;
  isAdmin: boolean;
  timestamp: number;
}
```

**Key Functions:**

1. **`login(token, profile, rememberMe)`** - AuthContext
   - Accepts optional `rememberMe` boolean parameter
   - Stores session in localStorage if `rememberMe === true`
   - Stores session in sessionStorage if `rememberMe === false`
   - Logs storage type for debugging

2. **`logout(skipServerCall)`** - AuthContext
   - Clears auth data from both storage types
   - Ensures clean logout regardless of storage location
   - Calls server logout endpoint (unless skipped)

3. **`checkSession()`** - Initial app load
   - Checks localStorage first (persistent sessions)
   - Falls back to sessionStorage (temporary sessions)
   - Validates session with server before restoring
   - Handles expired/invalid sessions gracefully

4. **`refreshTokenSilent(newToken)`** - Token refresh
   - Updates stored token when auto-refresh occurs
   - Preserves storage location (local vs session)
   - Maintains user's persistence preference

### Token Auto-Refresh:

The app automatically refreshes tokens before they expire, but **only if the user is active**:

- ✅ Active user (within 3 hours): Token refreshed automatically
- ❌ Inactive user (>3 hours): Session expires naturally
- Token updates are persisted to storage (local or session based on original choice)

**Inactivity Thresholds:**
- Regular users: 3 hours
- Admin users: 48 hours (configurable)

### Files Modified:

- ✅ `/contexts/AuthContext.tsx` - Added storage persistence logic
- ✅ `/components/auth/LoginPage.tsx` - Pass `rememberMe` to login handler
- ✅ `/hooks/useAutoTokenRefresh.ts` - Already had activity tracking

### Security Considerations:

**Best Practices:**
- Default to sessionStorage (more secure)
- Clear storage on logout
- Validate server-side session before restoring
- Activity-based token refresh prevents abandoned sessions

**User Guidelines:**
- ✅ Use "Stay logged in" on personal devices
- ❌ Never use "Stay logged in" on public/shared computers
- Always log out when finished on shared devices

### Professional Platform Comparison:

Our implementation matches industry standards:
- **Google/Gmail**: "Stay signed in" checkbox
- **Facebook**: "Keep me logged in" checkbox
- **Banking apps**: Session vs persistent storage based on device trust
- **AWS Console**: Activity-based token refresh

---

## 🔐 Session Timeout & Auto-Redirect

**Improved: Saturday, November 1, 2025**  
**Logging Fixed: Sunday, November 2, 2025**

Session timeout now automatically redirects users to the login page with a clean, dismissible alert - no modal dialogs or extra clicks required.

### Logging Philosophy:

**Session timeout is NOT an error** - it's expected, normal behavior like a user clicking "logout".

**Professional Platform Standards:**
- ✅ **Google/Gmail**: Silent redirect, no console errors
- ✅ **Facebook/LinkedIn**: Info notification, not error
- ✅ **Banking apps**: Info-level logging only
- ✅ **AWS/Stripe**: Clean info messages

**Our Implementation:**
- ✅ `console.info()` for session expiration (not `console.error()`)
- ✅ Info-level logging with ℹ️ emoji (not 🔴 red error emoji)
- ✅ Clean console output - no scary red errors for normal events
- ✅ Toast notifications removed (auto-redirect is cleaner)

### User Experience Flow:

**Before (Old UX):**
1. Session times out
2. Modal dialog appears blocking the screen
3. User must click "Go to Login Page" button
4. Finally redirected to login

**After (New UX):**
1. Session times out
2. **Automatically redirected to login page** (no dialog)
3. Clean dismissible alert banner shows at top: "Session Timed Out. Your session timed out due to inactivity. Please log in again."
4. User can dismiss alert with X button

### Implementation Details:

**AuthContext Changes:**
- Added `sessionTimedOut` state flag
- Added `logoutDueToTimeout()` method that sets flag and logs out
- Added `clearSessionTimeoutFlag()` to dismiss the alert

**AuthenticatedApp Changes:**
- Removed `SessionExpiredDialog` component usage
- Session expiration handler now immediately calls `logoutDueToTimeout()`
- No dialog state management needed

**LoginPage Changes:**
- Added `sessionTimedOut` and `onDismissTimeout` props
- Shows amber-colored alert banner at top when session timed out
- Alert includes AlertCircle icon and X button to dismiss
- Theme-aware styling (works in light/dark mode)

**Files Modified:**
- `/contexts/AuthContext.tsx` - Added session timeout state management
- `/components/AuthenticatedApp.tsx` - Removed dialog, immediate redirect
- `/components/auth/LoginPage.tsx` - Added dismissible alert banner
- `/App.tsx` - Pass session timeout props to LoginPage

**Benefits:**
- ✅ **Faster UX** - No extra clicks to get to login
- ✅ **Cleaner UI** - Alert banner instead of blocking modal
- ✅ **User-friendly** - Dismissible alert with clear message
- ✅ **Professional** - Matches commercial platform UX patterns
- ✅ **Theme-aware** - Works perfectly in both light and dark modes

**Design Inspiration:**
Based on standard commercial platform patterns where session timeout automatically returns users to login with a brief, dismissible notification rather than requiring manual navigation.
