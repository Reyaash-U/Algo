import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('av-theme');
    if (saved) return saved;
    const systemPref = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    return systemPref;
  });

  useEffect(() => {
    localStorage.setItem('av-theme', theme);
    document.documentElement.className = `av-theme-${theme}`;
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
