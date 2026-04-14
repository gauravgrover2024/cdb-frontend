import React, { createContext, useContext, useEffect } from "react";
import { ConfigProvider, theme } from "antd";

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const isDarkMode = false;

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("dark");
    sessionStorage.setItem("theme", "light");
    document.body.style.backgroundColor = "#f8fafc";
    document.body.style.color = "#0f172a";
  }, []);

  const toggleTheme = () => {};

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <ConfigProvider
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: "#2563eb",
            colorSuccess: "#16a34a",
            colorWarning: "#d97706",
            colorError: "#dc2626",
            colorTextBase: "#0f172a",
            colorBgBase: "#f8fafc",
            borderRadius: 8,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            colorBorder: "#e2e8f0",
            colorBgContainer: "#ffffff",
            colorBgLayout: "#f8fafc",
          },
          components: {
            Card: {
              colorBgContainer: "#ffffff",
              colorBorderSecondary: "#e2e8f0",
            },
            Layout: {
              colorBgHeader: "rgba(248,250,252,0.90)",
              colorBgBody: "#f8fafc",
              colorBgLayout: "#f8fafc",
            },
            Table: {
              colorBgContainer: "#ffffff",
              colorHeaderBg: "#f1f5f9",
            },
            Button: {
              colorBgContainer: "#f1f5f9",
              colorTextSecondary: "#334155",
            },
            Input: {
              colorBgContainer: "#ffffff",
              colorTextPlaceholder: "#94a3b8",
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};
