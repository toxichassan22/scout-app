import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const ThemeContext = createContext(null);

const THEMES = {
  dark: {
    '--ink': '#0a0f0a',
    '--ink-2': '#111a11',
    '--panel': 'rgba(14, 24, 14, 0.92)',
    '--panel-2': 'rgba(18, 32, 18, 0.88)',
    '--line': 'rgba(16, 185, 129, 0.15)',
    '--green': '#10b981',
    '--green-soft': 'rgba(16, 185, 129, 0.1)',
    '--amber': '#f59e0b',
    '--amber-soft': 'rgba(245, 158, 11, 0.1)',
    '--danger': '#ef4444',
    '--text': '#e2e8f0',
    '--text-dim': '#94a3b8',
    '--bg-gradient-1': 'rgba(16, 185, 129, 0.07)',
    '--bg-gradient-2': 'rgba(245, 158, 11, 0.05)',
  },
  light: {
    '--ink': '#f8fafb',
    '--ink-2': '#eef2f5',
    '--panel': 'rgba(255, 255, 255, 0.95)',
    '--panel-2': 'rgba(240, 244, 247, 0.95)',
    '--line': 'rgba(5, 150, 105, 0.18)',
    '--green': '#059669',
    '--green-soft': 'rgba(5, 150, 105, 0.08)',
    '--amber': '#b45309',
    '--amber-soft': 'rgba(180, 83, 9, 0.08)',
    '--danger': '#dc2626',
    '--text': '#1e293b',
    '--text-dim': '#64748b',
    '--bg-gradient-1': 'rgba(5, 150, 105, 0.04)',
    '--bg-gradient-2': 'rgba(180, 83, 9, 0.03)',
  },
  neon: {
    '--ink': '#06060f',
    '--ink-2': '#0c0c1a',
    '--panel': 'rgba(8, 8, 20, 0.95)',
    '--panel-2': 'rgba(12, 12, 25, 0.92)',
    '--line': 'rgba(0, 229, 255, 0.12)',
    '--green': '#00e5ff',
    '--green-soft': 'rgba(0, 229, 255, 0.08)',
    '--amber': '#a855f7',
    '--amber-soft': 'rgba(168, 85, 247, 0.08)',
    '--danger': '#f43f5e',
    '--text': '#e0f2fe',
    '--text-dim': '#7dd3fc',
    '--bg-gradient-1': 'rgba(0, 229, 255, 0.05)',
    '--bg-gradient-2': 'rgba(168, 85, 247, 0.04)',
  },
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('dsc_theme') || 'dark'; }
    catch { return 'dark'; }
  });

  useEffect(() => {
    const vars = THEMES[theme] || THEMES.dark;
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    try { localStorage.setItem('dsc_theme', theme); } catch {}
  }, [theme]);

  const cycle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : t === 'light' ? 'neon' : 'dark'));
  }, []);

  const value = useMemo(() => ({ theme, setTheme, cycle }), [theme, cycle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export { THEMES };
