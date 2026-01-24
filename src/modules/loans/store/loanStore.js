// src/modules/loans/store/loanStore.js

const LOANS_KEY = "autocredits_loans";
const LOAN_COUNTER_KEY = "autocredits_loan_counter";

export const loanStore = {
  // Get all loans
  getAllLoans: () => {
    const loans = localStorage.getItem(LOANS_KEY);
    return loans ? JSON.parse(loans) : [];
  },

  // Get single loan by ID
  getLoanById: (loanId) => {
    const loans = loanStore.getAllLoans();
    return loans.find((loan) => loan.id === parseInt(loanId));
  },

  // Create new loan
  createLoan: (loanData) => {
    const loans = loanStore.getAllLoans();
    const counter = parseInt(localStorage.getItem(LOAN_COUNTER_KEY) || 0) + 1;

    const newLoan = {
      id: counter,
      ...loanData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStep: "customer-profile",
      completedSteps: [],
    };

    loans.push(newLoan);
    localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
    localStorage.setItem(LOAN_COUNTER_KEY, counter.toString());

    return newLoan;
  },

  // Update loan (save progress as we go)
  updateLoan: (loanId, stepName, stepData) => {
    const loans = loanStore.getAllLoans();
    const loanIndex = loans.findIndex((loan) => loan.id === parseInt(loanId));

    if (loanIndex !== -1) {
      loans[loanIndex] = {
        ...loans[loanIndex],
        [stepName]: {
          ...loans[loanIndex][stepName],
          ...stepData,
        },
        updatedAt: new Date().toISOString(),
      };

      // Mark step as completed if not already
      if (!loans[loanIndex].completedSteps.includes(stepName)) {
        loans[loanIndex].completedSteps.push(stepName);
      }

      localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
      return loans[loanIndex];
    }
    return null;
  },

  // Update current step
  updateCurrentStep: (loanId, stepName) => {
    const loans = loanStore.getAllLoans();
    const loanIndex = loans.findIndex((loan) => loan.id === parseInt(loanId));

    if (loanIndex !== -1) {
      loans[loanIndex].currentStep = stepName;
      loans[loanIndex].updatedAt = new Date().toISOString();
      localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
      return loans[loanIndex];
    }
    return null;
  },

  // Delete loan
  deleteLoan: (loanId) => {
    const loans = loanStore.getAllLoans();
    const filtered = loans.filter((loan) => loan.id !== parseInt(loanId));
    localStorage.setItem(LOANS_KEY, JSON.stringify(filtered));
  },

  // Get loans by customer ID
  getLoansByCustomerId: (customerId) => {
    const loans = loanStore.getAllLoans();
    return loans.filter((loan) => loan.customerId === customerId);
  },

  // Clear all loans (for testing)
  clearAll: () => {
    localStorage.removeItem(LOANS_KEY);
    localStorage.removeItem(LOAN_COUNTER_KEY);
  },
};

export default loanStore;
