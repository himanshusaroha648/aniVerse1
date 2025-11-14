import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();
const themes = ['theme-dark', 'theme-darkBlue', 'theme-nightNeon'];

export function ThemeProvider({ children }) {
  const [themeIndex, setThemeIndex] = useState(() => {
    const stored = localStorage.getItem('aniverse-theme');
    return stored ? themes.indexOf(stored) : 0;
  });

  useEffect(() => {
    const current = themes[themeIndex] ?? themes[0];
    document.documentElement.classList.remove(...themes);
    document.documentElement.classList.add(current);
    localStorage.setItem('aniverse-theme', current);
  }, [themeIndex]);

  const cycleTheme = () => {
    setThemeIndex((prev) => (prev + 1) % themes.length);
  };

  const value = {
    theme: themes[themeIndex],
    cycleTheme,
    label: (() => {
      switch (themes[themeIndex]) {
        case 'theme-darkBlue':
          return 'Dark Blue';
        case 'theme-nightNeon':
          return 'Night Neon';
        default:
          return 'Dark';
      }
    })()
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);