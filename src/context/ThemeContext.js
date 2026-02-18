import React, { createContext, useContext, useEffect, useState } from "react";
import { ConfigProvider, theme } from "antd";

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
      document.body.style.backgroundColor = "#000000";
      document.body.style.color = "#ffffff";
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
      document.body.style.backgroundColor = "#ffffff";
      document.body.style.color = "#0f1419";
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <ConfigProvider
        theme={{
          algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: "#1d9bf0", 
            colorSuccess: "#00ba7c",
            colorWarning: "#ffd400",
            colorError: "#f4212e",
            colorTextBase: isDarkMode ? "#ffffff" : "#0f1419",
            colorBgBase: isDarkMode ? "#000000" : "#ffffff",
            borderRadius: 8,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            colorBorder: isDarkMode ? "#2f3336" : "#eff3f4",
            colorBgContainer: isDarkMode ? "#000000" : "#ffffff",
            colorBgLayout: isDarkMode ? "#000000" : "#ffffff",
          },
          components: {
            Card: {
              colorBgContainer: isDarkMode ? "#000000" : "#ffffff",
              colorBorderSecondary: isDarkMode ? "#2f3336" : "#eff3f4",
            },
            Layout: {
              colorBgHeader: isDarkMode ? "rgba(0, 0, 0, 0.85)" : "rgba(255, 255, 255, 0.85)",
              colorBgBody: isDarkMode ? "#000000" : "#ffffff",
              colorBgLayout: isDarkMode ? "#000000" : "#ffffff",
            },
            Table: {
              colorBgContainer: isDarkMode ? "#000000" : "#ffffff",
              colorHeaderBg: isDarkMode ? "#000000" : "#ffffff",
            },
            Button: {
              colorBgContainer: isDarkMode ? "#1a1a1a" : "#f5f5f5",
              colorTextSecondary: isDarkMode ? "#ffffff" : "#000000",
            },
            Input: {
              colorBgContainer: isDarkMode ? "#1a1a1a" : "#ffffff",
              colorTextPlaceholder: isDarkMode ? "#888888" : "#bfbfbf",
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};
