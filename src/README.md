# Online Exam Platform

A comprehensive web-based exam platform with two-pane vertical split screen layout, admin backend, and Contentful CMS integration.

## 🚀 Quick Start (VSCode)

This project runs in **Figma Make** (web-based IDE) but can be edited in VSCode with TypeScript support:

```bash
# 1. Clone/download the project
cd your-project-folder

# 2. Install dependencies (for VSCode IntelliSense only)
npm install

# 3. Open in VSCode
code .

# 4. Reload VSCode window after install
# Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows)
# Type "Reload Window" and press Enter
```

### ✅ After Setup, VSCode Will Provide:
- React and TypeScript IntelliSense
- Auto-imports for components
- Type checking for `/supabase/functions/server/types.ts`
- Error highlighting and code navigation

### ⚠️ Important Notes:
- **`node_modules/` is for local type checking only** - Don't commit it!
- **Figma Make auto-bundles all dependencies** - No build step needed there
- **Always test in Figma Make** before committing changes
- See `/Guidelines.md` for complete documentation

## 📁 Project Structure

```
/App.tsx                           # Main entry point
/supabase/functions/server/types.ts # Single Source of Truth for all types
/components/                       # React components
  /admin/                          # Admin interface
    /dialogs/                      # Modal dialogs
    /sections/                     # Admin sections
  /exam/                           # Exam interface
    /views/                        # Exam views (taking, results, review)
  /ui/                             # shadcn/ui components
/supabase/functions/server/        # Backend server (Deno)
/hooks/                            # Custom React hooks
/contexts/                         # React contexts
/utils/                            # Utility functions
```

## 🔧 Troubleshooting

### "Cannot find module 'react'"

**Solution:** Run `npm install` in the project root, then reload VSCode window.

See `/Guidelines.md` → "Troubleshooting VSCode Setup" for detailed solutions.

## 📚 Documentation

- **`/Guidelines.md`** - Complete development guidelines and project history
- **`/supabase/functions/server/types.ts`** - Single Source of Truth for all TypeScript types

## 🛠️ Development Workflow

1. **Edit in VSCode** - Get full TypeScript IntelliSense
2. **Test in Figma Make** - Always verify changes work
3. **Type definitions** - Always use types from `/supabase/functions/server/types.ts`

## 🔒 Protected Files (Do Not Edit)

- `/supabase/functions/server/kv_store.tsx`
- `/utils/supabase/info.tsx`
- `/components/figma/ImageWithFallback.tsx`

## 🎯 Key Features

- ✅ Two-pane exam interface with adjustable divider
- ✅ Question flagging and commenting
- ✅ Highlighter system with theme-aware persistence
- ✅ Tools dropdown (Answer Eliminator)
- ✅ Comprehensive admin backend
- ✅ Contentful CMS integration
- ✅ Exam review and results
- ✅ User authentication and session management

## 📞 Support

See `/Guidelines.md` for detailed troubleshooting and development guidelines.
