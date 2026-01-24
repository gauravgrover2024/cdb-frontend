module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background))",
        foreground: "rgb(var(--foreground))",

        card: "rgb(var(--card))",
        "card-foreground": "rgb(var(--card-foreground))",

        border: "rgb(var(--border))",
        muted: "rgb(var(--muted))",
        "muted-foreground": "rgb(var(--muted-foreground))",

        primary: "rgb(var(--primary))",
        "primary-foreground": "rgb(var(--primary-foreground))",

        success: "rgb(var(--success))",
        warning: "rgb(var(--warning))",
        error: "rgb(var(--error))",
      },
    },
  },
  plugins: [],
};
