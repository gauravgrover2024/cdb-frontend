/**
 * EMI Calculator Utilities
 * Financial calculations for loan EMI, repayment schedules, and outstanding balances
 */
import { formatINR } from './currency';

/**
 * Calculate EMI using the reducing balance method
 * Formula: EMI = [P × R × (1+R)^N] / [(1+R)^N – 1]
 * 
 * @param {number} principal - Loan amount
 * @param {number} annualRate - Annual interest rate (in percentage, e.g., 10.5 for 10.5%)
 * @param {number} tenureMonths - Loan tenure in months
 * @returns {number} Monthly EMI amount (rounded to nearest integer)
 */
/**
 * Calculate EMI using Reducing Balance or Flat Rate method
 * 
 * @param {number} principal - Loan amount
 * @param {number} annualRate - Annual interest rate (in percentage)
 * @param {number} tenureMonths - Loan tenure in months
 * @param {string} type - 'Reducing' (default) or 'Flat'
 * @returns {number} Monthly EMI amount (rounded to nearest integer)
 */
export const calculateEMI = (principal, annualRate, tenureMonths, type = "Reducing") => {
  const P = Number(String(principal).replace(/[^0-9.]/g, "")) || 0;
  const N = Number(tenureMonths) || 0;
  
  if (!P || !N) return 0;

  if (type === "Flat") {
    // Flat Rate Formula: Total Interest = P * R_annual% * Years
    // Total Amount = P + Total Interest
    // EMI = Total Amount / N_months
    const yearlyRate = (Number(annualRate) || 0) / 100;
    const years = N / 12;
    const totalInterest = P * yearlyRate * years;
    const totalAmount = P + totalInterest;
    return Math.round(totalAmount / N);
  }

  // Reducing Balance Formula
  const R = (Number(annualRate) || 0) / 12 / 100; // Monthly rate
  if (!R) return Math.round(P / N); // 0% interest

  const pow = Math.pow(1 + R, N);
  return Math.round((P * R * pow) / (pow - 1));
};

/**
 * Generate complete loan repayment schedule (amortization table)
 * Shows month-by-month breakdown of principal, interest, and outstanding balance
 * 
 * @param {number} principal - Loan amount
 * @param {number} annualRate - Annual interest rate (in percentage)
 * @param {number} tenureMonths - Loan tenure in months
 * @param {Date|string} firstEmiDate - Date of first EMI payment
 * @param {string} type - 'Reducing' (default) or 'Flat'
 * @returns {Array} Array of payment schedule objects
 */
export const generateRepaymentSchedule = (principal, annualRate, tenureMonths, firstEmiDate = null, type = "Reducing") => {
  const P = Number(principal) || 0;
  const N = Number(tenureMonths) || 0;
  
  if (!P || !N) return [];

  const emi = calculateEMI(P, annualRate, N, type);
  const schedule = [];
  
  // Parse first EMI date or use current date
  let currentDate = firstEmiDate ? new Date(firstEmiDate) : new Date();

  // Handling Flat Rate Schedule (Equal Principal, Equal Interest)
  if (type === "Flat") {
    const yearlyRate = (Number(annualRate) || 0) / 100;
    const years = N / 12;
    const totalInterest = P * yearlyRate * years;
    const monthlyInterest = Math.round(totalInterest / N);
    const monthlyPrincipal = Math.round(P / N);
    
    // Adjust last month for rounding errors
    let balance = P;
    
    for (let month = 1; month <= N; month++) {
      let principalPayment = monthlyPrincipal;
      let interestPayment = monthlyInterest;
      
      // Last month adjustment if needed ensures balance hits 0
      if (month === N) {
        principalPayment = balance;
        interestPayment = emi - principalPayment;
      }
      
      balance = Math.max(0, balance - principalPayment);

      schedule.push({
        month,
        date: new Date(currentDate),
        emi,
        principalPayment,
        interestPayment,
        outstandingBalance: Math.round(balance),
        totalPaid: emi * month,
        totalPrincipal: Math.round(P - balance),
        totalInterest: (emi * month) - Math.round(P - balance),
      });
      currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
    }
    return schedule;
  }

  // Reducing Balance Logic
  const monthlyRate = (Number(annualRate) || 0) / 12 / 100;
  let balance = P;

  for (let month = 1; month <= N; month++) {
    const interestPayment = Math.round(balance * monthlyRate);
    const principalPayment = emi - interestPayment;
    balance = Math.max(0, balance - principalPayment);

    schedule.push({
      month,
      date: new Date(currentDate),
      emi,
      principalPayment: Math.round(principalPayment),
      interestPayment, // Calculated on reducing balance
      outstandingBalance: Math.round(balance),
      totalPaid: emi * month,
      totalPrincipal: Math.round(P - balance),
      totalInterest: (emi * month) - Math.round(P - balance),
    });

    // Move to next month
    currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
  }

  return schedule;
};

/**
 * Calculate current outstanding principal based on actual payments made
 * 
 * @param {number} principal - Original loan amount
 * @param {number} annualRate - Annual interest rate
 * @param {number} tenureMonths - Total tenure in months
 * @param {Date|string} disbursementDate - Loan disbursement date
 * @param {Array} payments - Array of actual payment records [{date, amount}]
 * @returns {Object} Outstanding calculation with details
 */
export const calculatePrincipalOutstanding = (
  principal,
  annualRate,
  tenureMonths,
  disbursementDate,
  payments = []
) => {
  const P = Number(principal) || 0;
  const N = Number(tenureMonths) || 0;
  const monthlyRate = (Number(annualRate) || 0) / 12 / 100;

  if (!P || !N || !monthlyRate || !disbursementDate) {
    return {
      outstanding: P,
      paidInstallments: 0,
      totalPaid: 0,
      totalPrincipalPaid: 0,
      totalInterestPaid: 0,
      remainingInstallments: N,
    };
  }

  const emi = calculateEMI(P, annualRate, N);
  const schedule = generateRepaymentSchedule(P, annualRate, N, disbursementDate);
  
  // Calculate based on actual payments
  let totalPaid = 0;
  let paidCount = 0;

  if (payments && payments.length > 0) {
    totalPaid = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
    paidCount = payments.length;
  } else {
    // If no payment records, calculate based on due installments
    const disbursedDate = new Date(disbursementDate);
    const today = new Date();
    const monthsDiff = (today.getFullYear() - disbursedDate.getFullYear()) * 12 + 
                       (today.getMonth() - disbursedDate.getMonth());
    paidCount = Math.min(Math.max(0, monthsDiff), N);
    totalPaid = emi * paidCount;
  }

  // Find outstanding from schedule
  const paidSchedule = schedule.slice(0, paidCount);
  const lastPaid = paidSchedule[paidSchedule.length - 1] || { 
    outstandingBalance: P,
    totalPrincipal: 0,
    totalInterest: 0
  };

  return {
    outstanding: lastPaid.outstandingBalance,
    paidInstallments: paidCount,
    totalPaid: Math.round(totalPaid),
    totalPrincipalPaid: lastPaid.totalPrincipal || 0,
    totalInterestPaid: lastPaid.totalInterest || 0,
    remainingInstallments: N - paidCount,
    emi,
    schedule,
  };
};

/**
 * Calculate live principal outstanding based on current date
 * (Assumes all EMIs paid on time)
 * 
 * @param {number} principal - Loan amount
 * @param {number} annualRate - Annual interest rate
 * @param {number} tenureMonths - Loan tenure in months
 * @param {Date|string} firstEmiDate - First EMI date
 * @returns {Object} Live outstanding calculation
 */
export const calculateLivePrincipalOutstanding = (principal, annualRate, tenureMonths, firstEmiDate) => {
  if (!firstEmiDate) {
    return {
      outstanding: principal,
      monthsElapsed: 0,
      monthsRemaining: tenureMonths,
      progressPercentage: 0,
    };
  }

  const today = new Date();
  const emiDate = new Date(firstEmiDate);
  
  // Calculate months elapsed since first EMI
  const monthsElapsed = Math.max(0, 
    (today.getFullYear() - emiDate.getFullYear()) * 12 + 
    (today.getMonth() - emiDate.getMonth())
  );

  const monthsPaid = Math.min(monthsElapsed, tenureMonths);
  
  // Generate schedule and get outstanding
  const schedule = generateRepaymentSchedule(principal, annualRate, tenureMonths, firstEmiDate);
  const currentMonth = schedule[monthsPaid] || schedule[schedule.length - 1];
  
  const outstanding = monthsPaid >= tenureMonths ? 0 : currentMonth?.outstandingBalance || principal;
  const progressPercentage = Math.round((monthsPaid / tenureMonths) * 100);

  return {
    outstanding,
    monthsElapsed: monthsPaid,
    monthsRemaining: Math.max(0, tenureMonths - monthsPaid),
    progressPercentage,
    emi: calculateEMI(principal, annualRate, tenureMonths),
    totalPaid: monthsPaid * calculateEMI(principal, annualRate, tenureMonths),
  };
};

/**
 * Format currency for display (Indian Standard: ₹ with en-IN grouping)
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string e.g. ₹12,34,567
 */
export const formatCurrency = (amount) => formatINR(amount);

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
