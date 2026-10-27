import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  customCursor: boolean;
  setCustomCursor: (enabled: boolean) => void;
}

const THEME_STORAGE_KEY = 'krum_theme_preference';
const CURSOR_STORAGE_KEY = 'krum_custom_cursor_preference';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        return saved;
      }
    } catch (e) {
      // Ignore localStorage read errors
    }
    return 'dark'; // KRUM default: modern sleek dark theme
  });

  const [customCursor, setCustomCursorState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(CURSOR_STORAGE_KEY);
      if (saved !== null) {
        return saved === 'true';
      }
    } catch (e) {
      // Ignore
    }
    return true; // Custom arrow enabled by default
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Listen to OS theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const effectiveTheme: 'light' | 'dark' =
    theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme;

  // Apply dark class to documentElement
  useEffect(() => {
    const root = document.documentElement;
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [effectiveTheme]);

  // Apply custom cursor class to root
  useEffect(() => {
    const root = document.documentElement;
    if (customCursor) {
      root.classList.add('krum-custom-cursor-active');
    } else {
      root.classList.remove('krum-custom-cursor-active');
    }
  }, [customCursor]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('Could not save theme:', e);
    }
  };

  const toggleTheme = () => {
    const nextTheme = effectiveTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const setCustomCursor = (enabled: boolean) => {
    setCustomCursorState(enabled);
    try {
      localStorage.setItem(CURSOR_STORAGE_KEY, String(enabled));
    } catch (e) {
      console.warn('Could not save custom cursor preference:', e);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        effectiveTheme,
        setTheme,
        toggleTheme,
        customCursor,
        setCustomCursor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
