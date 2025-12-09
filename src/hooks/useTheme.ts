import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light' | 'dark';
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function useThemeLogic() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Load theme from localStorage on initial load
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('exam-theme');
      if (stored && (stored === 'light' || stored === 'dark' || stored === 'system')) {
        return stored as Theme;
      }
    }
    return 'system';
  });

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Save theme to localStorage
    localStorage.setItem('exam-theme', theme);

    // Calculate effective theme
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setEffectiveTheme(systemTheme);
    } else {
      setEffectiveTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    // Listen for system theme changes when using system theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        setEffectiveTheme(e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(effectiveTheme);
  }, [effectiveTheme]);

  return {
    theme,
    setTheme,
    effectiveTheme,
  };
}