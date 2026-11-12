import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type CursorMode = 'round' | 'arrow' | 'system';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  cursorMode: CursorMode;
  setCursorMode: (mode: CursorMode) => void;
  cycleCursorMode: () => void;
  customCursor: boolean;
  setCustomCursor: (enabled: boolean) => void;
}

const THEME_STORAGE_KEY = 'krum_theme_preference';
const CURSOR_MODE_STORAGE_KEY = 'krum_cursor_mode_preference';
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

  const [cursorMode, setCursorModeState] = useState<CursorMode>(() => {
    try {
      const savedMode = localStorage.getItem(CURSOR_MODE_STORAGE_KEY) as CursorMode;
      if (savedMode && ['round', 'arrow', 'system'].includes(savedMode)) {
        return savedMode;
      }
      // Migrate legacy boolean if present
      const savedLegacy = localStorage.getItem(CURSOR_STORAGE_KEY);
      if (savedLegacy === 'false') return 'system';
    } catch (e) {
      // Ignore
    }
    return 'round'; // Default to round cursor as requested!
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

  // Apply custom cursor classes to root element
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('krum-custom-cursor-active', 'krum-cursor-round', 'krum-cursor-arrow');

    if (cursorMode === 'round') {
      root.classList.add('krum-custom-cursor-active', 'krum-cursor-round');
    } else if (cursorMode === 'arrow') {
      root.classList.add('krum-custom-cursor-active', 'krum-cursor-arrow');
    }
  }, [cursorMode]);

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

  const setCursorMode = (mode: CursorMode) => {
    setCursorModeState(mode);
    try {
      localStorage.setItem(CURSOR_MODE_STORAGE_KEY, mode);
      localStorage.setItem(CURSOR_STORAGE_KEY, String(mode !== 'system'));
    } catch (e) {
      console.warn('Could not save cursor mode:', e);
    }
  };

  const cycleCursorMode = () => {
    const cycle: Record<CursorMode, CursorMode> = {
      round: 'arrow',
      arrow: 'system',
      system: 'round',
    };
    setCursorMode(cycle[cursorMode]);
  };

  const setCustomCursor = (enabled: boolean) => {
    if (enabled) {
      setCursorMode(cursorMode === 'system' ? 'round' : cursorMode);
    } else {
      setCursorMode('system');
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        effectiveTheme,
        setTheme,
        toggleTheme,
        cursorMode,
        setCursorMode,
        cycleCursorMode,
        customCursor: cursorMode !== 'system',
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
