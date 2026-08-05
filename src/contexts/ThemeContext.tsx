import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

export type ThemeKey = 'light' | 'dark' | 'soft-pastel' | 'midnight-blue' | 'warm-beige' | 'forest' | 'monochrome';

export interface ThemeConfig {
  key: ThemeKey;
  label: string;
  type: 'light' | 'dark';
}

export const AVAILABLE_THEMES: ThemeConfig[] = [
  { key: 'light', label: 'Light', type: 'light' },
  { key: 'dark', label: 'Dark', type: 'dark' },
  { key: 'soft-pastel', label: 'Soft Pastel', type: 'light' },
  { key: 'midnight-blue', label: 'Midnight Blue', type: 'dark' },
  { key: 'warm-beige', label: 'Warm Beige', type: 'light' },
  { key: 'forest', label: 'Forest', type: 'dark' },
  { key: 'monochrome', label: 'Monochrome', type: 'light' },
];

interface ThemeContextType {
  theme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  toggleTheme: () => void; // Keeps backward compatibility by toggling between light and dark
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const settings = useLiveQuery(() => db.settings.get('global'));
  const [localTheme, setLocalTheme] = useState<ThemeKey>('light');

  useEffect(() => {
    if (settings && settings.theme) {
      setLocalTheme(settings.theme as ThemeKey);
    }
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    const themeConfig = AVAILABLE_THEMES.find(t => t.key === localTheme) || AVAILABLE_THEMES[0];
    
    // Set data attribute for custom color mappings in CSS
    root.setAttribute('data-theme', themeConfig.key);
    
    // Toggle Tailwind dark mode class
    if (themeConfig.type === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [localTheme]);

  const setTheme = async (newTheme: ThemeKey) => {
    setLocalTheme(newTheme);
    const existing = await db.settings.get('global');
    if (existing) {
      await db.settings.update('global', { theme: newTheme });
    } else {
      await db.settings.put({ id: 'global', theme: newTheme, language: 'en', globalReminderTime: '20:00' });
    }
  };

  const toggleTheme = async () => {
    const currentType = (AVAILABLE_THEMES.find(t => t.key === localTheme) || AVAILABLE_THEMES[0]).type;
    const newTheme = currentType === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme: localTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
