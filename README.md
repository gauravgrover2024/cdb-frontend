

# ACILLP Frontend

This is the React frontend for the Auto Credit LLP platform. It provides a modern, responsive UI for managing vehicle loans, customers, payments, delivery orders, and more.

## 📁 Structure

```
src/
	api/         # API client functions
	components/  # Reusable UI components
	modules/     # Feature modules (auth, customers, loans, etc.)
	context/     # React context (Theme)
	hooks/       # Custom React hooks
	store/       # State management
	utils/       # Utility functions
	styles/      # Global styles
	App.js       # Main app component
	index.js     # Entry point
```

## 🚀 Getting Started

```bash
cd ACILLP-FRONTEND
npm install
npm start
```

The app will run on `http://localhost:3000` by default.

## 🧩 Main Functions

- **convertAnyDateToDayjsDeep** (`src/utils/formDataProtection.js`): Recursively converts ISO date strings to dayjs objects.
- **cn** (`src/utils/cn.js`, `src/lib/utils.js`): Utility to merge Tailwind and clsx class names.
- **HeaderWrapper** (`src/App.js`): Wrapper component for header and main content area.
- **App** (`src/App.js`): Main React app component.

## 🛠️ Tech Stack

- React 18+
- Ant Design 5.x
- Tailwind CSS + PostCSS
- Axios
- dayjs

## 📦 Features

- Multi-stage loan workflow
- Customer, loan, payment, and vehicle management
- Role-based authentication
- Responsive design with dark mode
- Data tables with filtering and pagination
- Auto-save and real-time feedback

## 📄 Environment Variables

Create a `.env` file in this directory:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

---
This project is proprietary to Auto Credit LLP.
