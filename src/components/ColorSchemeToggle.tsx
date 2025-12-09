import { Palette, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { useEffect, useState } from 'react';

// Define popular color schemes
const colorSchemes = {
  default: {
    name: 'Default',
    icon: '🎨',
    colors: {
      // Light mode colors
      light: {
        '--primary': '#030213',
        '--primary-foreground': 'oklch(1 0 0)', // white text
        '--secondary': 'oklch(0.95 0.0058 264.53)',
        '--accent': '#e9ebef',
        '--chart-1': 'oklch(0.646 0.222 41.116)',
        '--chart-2': 'oklch(0.6 0.118 184.704)',
      },
      // Dark mode colors  
      dark: {
        '--primary': 'oklch(0.7 0.15 250)', // Blue primary (matches globals.css)
        '--primary-foreground': 'oklch(0.99 0 0)', // white text
        '--secondary': 'oklch(0.25 0 0)',
        '--accent': 'oklch(0.3 0 0)',
        '--chart-1': 'oklch(0.6 0.24 264)',
        '--chart-2': 'oklch(0.7 0.17 162)',
      }
    }
  },
  ocean: {
    name: 'Ocean Blue',
    icon: '🌊',
    colors: {
      light: {
        '--primary': '#0369a1', // sky-700 - dark blue for light mode
        '--primary-foreground': '#ffffff', // white text on blue bg
        '--secondary': '#e0f2fe', // sky-50
        '--accent': '#bae6fd', // sky-200
        '--chart-1': '#0ea5e9', // sky-500
        '--chart-2': '#0284c7', // sky-600
        '--sidebar-primary': '#0369a1', // sky-700
      },
      dark: {
        '--primary': '#0ea5e9', // sky-500 - bright blue for dark mode
        '--primary-foreground': '#ffffff', // white text on blue bg
        '--secondary': '#1e293b', // slate-800
        '--accent': '#334155', // slate-700
        '--chart-1': '#38bdf8', // sky-400
        '--chart-2': '#0ea5e9', // sky-500
        '--sidebar-primary': '#0ea5e9', // sky-500
      }
    }
  },
  forest: {
    name: 'Forest Green',
    icon: '🌲',
    colors: {
      light: {
        '--primary': '#15803d', // green-700 - dark green for light mode
        '--primary-foreground': '#ffffff', // white text on green bg
        '--secondary': '#f0fdf4', // green-50
        '--accent': '#bbf7d0', // green-200
        '--chart-1': '#22c55e', // green-500
        '--chart-2': '#16a34a', // green-600
        '--sidebar-primary': '#15803d', // green-700
      },
      dark: {
        '--primary': '#22c55e', // green-500 - bright green for dark mode
        '--primary-foreground': '#ffffff', // white text on green bg
        '--secondary': '#1f2937', // gray-800
        '--accent': '#374151', // gray-700
        '--chart-1': '#4ade80', // green-400
        '--chart-2': '#22c55e', // green-500
        '--sidebar-primary': '#22c55e', // green-500
      }
    }
  },
  sunset: {
    name: 'Sunset Orange',
    icon: '🌅',
    colors: {
      light: {
        '--primary': '#c2410c', // orange-700 - dark orange for light mode
        '--primary-foreground': '#ffffff', // white text on orange bg
        '--secondary': '#fff7ed', // orange-50
        '--accent': '#fed7aa', // orange-200
        '--chart-1': '#f97316', // orange-500
        '--chart-2': '#ea580c', // orange-600
        '--sidebar-primary': '#c2410c', // orange-700
      },
      dark: {
        '--primary': '#f97316', // orange-500 - bright orange for dark mode
        '--primary-foreground': '#ffffff', // white text on orange bg
        '--secondary': '#1f2937', // gray-800
        '--accent': '#374151', // gray-700
        '--chart-1': '#fb923c', // orange-400
        '--chart-2': '#f97316', // orange-500
        '--sidebar-primary': '#f97316', // orange-500
      }
    }
  },
  purple: {
    name: 'Royal Purple',
    icon: '👑',
    colors: {
      light: {
        '--primary': '#7c3aed', // purple-600 - vivid purple for light mode
        '--primary-foreground': '#ffffff', // white text on purple bg
        '--secondary': '#faf5ff', // purple-50
        '--accent': '#ddd6fe', // purple-200
        '--chart-1': '#a855f7', // purple-500
        '--chart-2': '#9333ea', // purple-600
        '--sidebar-primary': '#7c3aed', // purple-600
      },
      dark: {
        '--primary': '#a855f7', // purple-500 - bright purple for dark mode
        '--primary-foreground': '#ffffff', // white text on purple bg
        '--secondary': '#1f2937', // gray-800
        '--accent': '#374151', // gray-700
        '--chart-1': '#c084fc', // purple-400
        '--chart-2': '#a855f7', // purple-500
        '--sidebar-primary': '#a855f7', // purple-500
      }
    }
  },
  rose: {
    name: 'Rose Pink',
    icon: '🌹',
    colors: {
      light: {
        '--primary': '#be123c', // rose-700 - dark rose for light mode
        '--primary-foreground': '#ffffff', // white text on rose bg
        '--secondary': '#fff1f2', // rose-50
        '--accent': '#fecdd3', // rose-200
        '--chart-1': '#f43f5e', // rose-500
        '--chart-2': '#e11d48', // rose-600
        '--sidebar-primary': '#be123c', // rose-700
      },
      dark: {
        '--primary': '#f43f5e', // rose-500 - bright rose for dark mode
        '--primary-foreground': '#ffffff', // white text on rose bg
        '--secondary': '#1f2937', // gray-800
        '--accent': '#374151', // gray-700
        '--chart-1': '#fb7185', // rose-400
        '--chart-2': '#f43f5e', // rose-500
        '--sidebar-primary': '#f43f5e', // rose-500
      }
    }
  }
};

type ColorSchemeKey = keyof typeof colorSchemes;

export function ColorSchemeToggle() {
  const [currentScheme, setCurrentScheme] = useState<ColorSchemeKey>('default');

  // Load saved color scheme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('color-scheme') as ColorSchemeKey;
    if (saved && colorSchemes[saved]) {
      setCurrentScheme(saved);
      applyColorScheme(saved);
    }
  }, []);

  // Apply color scheme by updating CSS custom properties
  const applyColorScheme = (schemeKey: ColorSchemeKey) => {
    const scheme = colorSchemes[schemeKey];
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    
    // Apply colors based on current theme (light/dark)
    const colors = isDark ? scheme.colors.dark : scheme.colors.light;
    
    Object.entries(colors).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  };

  // Handle color scheme change
  const handleSchemeChange = (schemeKey: ColorSchemeKey) => {
    setCurrentScheme(schemeKey);
    localStorage.setItem('color-scheme', schemeKey);
    applyColorScheme(schemeKey);
  };

  // Reset to default scheme
  const resetToDefault = () => {
    handleSchemeChange('default');
    // Also remove any inline styles to fully reset
    const root = document.documentElement;
    Object.keys(colorSchemes.default.colors.light).forEach(property => {
      root.style.removeProperty(property);
    });
  };

  // Listen for theme changes and reapply color scheme
  useEffect(() => {
    const observer = new MutationObserver(() => {
      applyColorScheme(currentScheme);
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, [currentScheme]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
          <Palette className="h-4 w-4" />
          <span className="sr-only">Toggle color scheme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {Object.entries(colorSchemes).map(([key, scheme]) => (
          <DropdownMenuItem 
            key={key}
            onClick={() => handleSchemeChange(key as ColorSchemeKey)}
            className="cursor-pointer"
          >
            <span className="mr-2 text-sm">{scheme.icon}</span>
            <span>{scheme.name}</span>
            {currentScheme === key && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={resetToDefault} className="cursor-pointer">
          <RotateCcw className="mr-2 h-4 w-4" />
          <span>Reset</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}