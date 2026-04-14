import React, { createContext, useContext, useEffect, useState } from "react";
import { ConfigProvider, theme } from "antd";

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = sessionStorage.getItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    // Default to light mode if no preference saved
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      sessionStorage.setItem("theme", "dark");
      document.body.style.backgroundColor = "#050c1a";
      document.body.style.color = "#f1f5f9";
    } else {
      root.classList.remove("dark");
      sessionStorage.setItem("theme", "light");
      document.body.style.backgroundColor = "#f8fafc";
      document.body.style.color = "#0f172a";
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <ConfigProvider
        theme={{
          algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: "#2563eb",
            colorSuccess: "#16a34a",
            colorWarning: "#d97706",
            colorError: "#dc2626",
            colorTextBase: isDarkMode ? "#f1f5f9" : "#0f172a",
            colorBgBase: isDarkMode ? "#050c1a" : "#f8fafc",
            borderRadius: 8,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            colorBorder: isDarkMode ? "#1e293b" : "#e2e8f0",
            colorBgContainer: isDarkMode ? "#0a1628" : "#ffffff",
            colorBgLayout: isDarkMode ? "#050c1a" : "#f8fafc",
          },
          components: {
            Card: {
              colorBgContainer: isDarkMode ? "#0a1628" : "#ffffff",
              colorBorderSecondary: isDarkMode ? "#1e293b" : "#e2e8f0",
            },
            Layout: {
              colorBgHeader: isDarkMode ? "rgba(5,12,26,0.90)" : "rgba(248,250,252,0.90)",
              colorBgBody: isDarkMode ? "#050c1a" : "#f8fafc",
              colorBgLayout: isDarkMode ? "#050c1a" : "#f8fafc",
            },
            Table: {
              colorBgContainer: isDarkMode ? "#0a1628" : "#ffffff",
              colorHeaderBg: isDarkMode ? "#0f1f38" : "#f1f5f9",
            },
            Button: {
              colorBgContainer: isDarkMode ? "#0f1f38" : "#f1f5f9",
              colorTextSecondary: isDarkMode ? "#cbd5e1" : "#334155",
            },
            Input: {
              colorBgContainer: isDarkMode ? "#0a1628" : "#ffffff",
              colorTextPlaceholder: isDarkMode ? "#475569" : "#94a3b8",
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};
