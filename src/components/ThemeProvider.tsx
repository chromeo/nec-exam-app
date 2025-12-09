import { ReactNode } from 'react';
import { ThemeContext, useThemeLogic } from '../hooks/useTheme';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeLogic = useThemeLogic();

  return (
    <ThemeContext.Provider value={themeLogic}>
      {children}
    </ThemeContext.Provider>
  );
}