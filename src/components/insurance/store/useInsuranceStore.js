/**
 * useInsuranceStore.js
 * Zustand store for the Insurance Case Management Form.
 * Persists to localStorage key: 'insurance_case_draft'
 *
 * Pattern: The NewInsuranceCaseForm component syncs its local React state
 * into this store via a useEffect on every relevant state change. This gives
 * us localStorage draft persistence + computed selectors without refactoring
 * the complex orchestrator component.
 *
 * Computed selectors are plain functions (call them like `store.getGrossPremium()`).
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { addOnCatalog } from "../steps/allSteps";

// ─── Catalog defaults ────────────────────────────────────────────────────────

export const initialFormData = {
  // Basic setup
  buyerType: "Individual",
  vehicleType: "New Car",
  policyCategory: "Insurance Policy",
  policyDoneBy: "Autocredits India LLP",
  brokerName: "",
  showroomName: "",
  employeeName: "",
  employeeUserId: "",
  source: "Direct",
  sourceName: "",
  dealerChannelName: "",
  dealerChannelAddress: "",
  payoutApplicable: "No",
  payoutPercent: "",
  sourceOrigin: "Direct",

  // Customer / Company details
  customerName: "",
  companyName: "",
  contactPersonName: "",
  mobile: "",
  alternatePhone: "",
  email: "",
  gender: "",
  panNumber: "",
  aadhaarNumber: "",
  gstNumber: "",
  residenceAddress: "",
  pincode: "",
  city: "",

  // Nominee & Reference
  nomineeName: "",
  nomineeRelationship: "",
  nomineeDob: "",
  nomineeAge: "",
  referenceName: "",
  referencePhone: "",

  // Vehicle
  registrationNumber: "",
  registrationAllotted: "Yes",
  vehicleMake: "",
  vehicleModel: "",
  vehicleVariant: "",
  cubicCapacity: "",
  engineNumber: "",
  chassisNumber: "",
  typesOfVehicle: "Four Wheeler",
  manufactureYear: "",
  manufactureMonth: "",
  manufactureDate: "",
  regAuthority: "",
  dateOfReg: "",
  fuelType: "",
  batteryNumber: "",
  chargerNumber: "",
  hypothecation: "Not applicable",

  // Previous Policy
  previousInsuranceCompany: "Bajaj General Insurance Limited",
  previousPolicyNumber: "",
  previousPolicyType: "Comprehensive",
  previousPolicyStartDate: "",
  previousPolicyDuration: "1yr OD + 1yr TP",
  previousOdExpiryDate: "",
  previousTpExpiryDate: "",
  claimTakenLastYear: "No",
  previousNcbDiscount: 50,
  previousHypothecation: "Not Applicable",
  previousRemarks: "",

  // New Policy
  newInsuranceCompany: "",
  newPolicyType: "Comprehensive",
  newPolicyNumber: "",
  newIssueDate: "",
  newPolicyStartDate: "",
  newInsuranceDuration: "1yr OD + 1yr TP",
  newOdExpiryDate: "",
  newTpExpiryDate: "",
  newNcbDiscount: 0,
  newIdvAmount: 0,
  newTotalPremium: 0,
  subventionAmount: 0,
  subventionEntries: [],
  newHypothecation: "Not Applicable",
  newRemarks: "",

  // Vehicle pricing / sale info
  exShowroomPrice: 0,
  dateOfSale: "",
  dateOfPurchase: "",
  odometerReading: 0,
  policyPurchaseDate: "",

  // Extended Warranty
  ewCommencementDate: "",
  ewExpiryDate: "",
  kmsCoverage: 0,

  // Payout ledger
  insurance_receivables: [],
  insurance_payables: [],

  // Payment trackers
  customerPaymentExpected: 0,
  customerPaymentReceived: 0,
  inhousePaymentExpected: 0,
  inhousePaymentReceived: 0,
};

export const initialQuoteDraft = {
  insuranceCompany: "",
  coverageType: "Comprehensive",
  vehicleIdv: 0,
  cngIdv: 0,
  accessoriesIdv: 0,
  policyDuration: "1yr OD + 3yr TP",
  ncbDiscount: 50,
  odAmount: 0,
  thirdPartyAmount: 0,
  addOnsAmount: 0,
  addOns: addOnCatalog.reduce((acc, name) => ({ ...acc, [name]: 0 }), {}),
  addOnsIncluded: addOnCatalog.reduce(
    (acc, name) => ({ ...acc, [name]: false }),
    {},
  ),
};

// ─── NCB Slab Logic ──────────────────────────────────────────────────────────

/** NCB slabs: [0, 20, 25, 35, 45, 50]% */
export const NCB_SLABS = [0, 20, 25, 35, 45, 50];

/**
 * Advance or reset NCB slab.
 * @param {number} currentPct  – current NCB percentage
 * @param {boolean} hadClaim   – if true, resets to 0
 * @returns {number} new NCB percentage
 */
export function nextNcbSlab(currentPct, hadClaim) {
  if (hadClaim) return 0;
  const idx = NCB_SLABS.indexOf(Number(currentPct));
  if (idx === -1) return NCB_SLABS[1]; // unknown → 20
  return NCB_SLABS[Math.min(idx + 1, NCB_SLABS.length - 1)];
}

/**
 * Compute NCB discount amount from OD premium and slab %.
 * @param {number} basicODPremium
 * @param {number} ncbPercent
 */
export function calcNcbDiscount(basicODPremium, ncbPercent) {
  return (Number(basicODPremium || 0) * Number(ncbPercent || 0)) / 100;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useInsuranceStore = create(
  persist(
    (set, get) => ({
      // ── State slices for all 8 steps ────────────────────────────────────────
      formData: { ...initialFormData },
      quotes: [],
      acceptedQuoteId: null,
      documents: [],
      paymentHistory: [],
      step: 1,

      // ── Bulk sync (used by NewInsuranceCaseForm to push its React state in) ─
      syncData: (data) =>
        set((state) => ({
          formData: data.formData ?? state.formData,
          quotes: data.quotes ?? state.quotes,
          acceptedQuoteId:
            data.acceptedQuoteId !== undefined
              ? data.acceptedQuoteId
              : state.acceptedQuoteId,
          documents: data.documents ?? state.documents,
          paymentHistory: data.paymentHistory ?? state.paymentHistory,
          step: data.step ?? state.step,
        })),

      // ── Granular actions ────────────────────────────────────────────────────

      /** Set a single field on formData. */
      setField: (field, value) =>
        set((state) => ({
          formData: { ...state.formData, [field]: value },
        })),

      /**
       * Update formData.
       * Accepts either an updater function (prev => next) or a partial object.
       */
      setFormData: (updater) =>
        set((state) => ({
          formData:
            typeof updater === "function"
              ? updater(state.formData)
              : { ...state.formData, ...updater },
        })),

      /** Replace the quotes array (or use functional updater). */
      setQuotes: (updater) =>
        set((state) => ({
          quotes:
            typeof updater === "function" ? updater(state.quotes) : updater,
        })),

      /** Add a single quote to the list. */
      addQuote: (quote) =>
        set((state) => ({ quotes: [...state.quotes, quote] })),

      setAcceptedQuoteId: (id) => set({ acceptedQuoteId: id }),

      /** Replace documents array (or use functional updater). */
      setDocuments: (updater) =>
        set((state) => ({
          documents:
            typeof updater === "function"
              ? updater(state.documents)
              : updater,
        })),

      /** Replace paymentHistory (or use functional updater). */
      setPaymentHistory: (updater) =>
        set((state) => ({
          paymentHistory:
            typeof updater === "function"
              ? updater(state.paymentHistory)
              : updater,
        })),

      /** Add a payment entry to paymentHistory. */
      addPayment: (payment) =>
        set((state) => ({
          paymentHistory: [...state.paymentHistory, payment],
        })),

      setStep: (stepOrUpdater) =>
        set((state) => ({
          step:
            typeof stepOrUpdater === "function"
              ? stepOrUpdater(state.step)
              : stepOrUpdater,
        })),

      /** Hard-reset the store to initial state (e.g., after successful submit). */
      resetStore: () =>
        set({
          formData: { ...initialFormData },
          quotes: [],
          acceptedQuoteId: null,
          documents: [],
          paymentHistory: [],
          step: 1,
        }),

      // ── Computed selectors ──────────────────────────────────────────────────
      // Call as plain functions, NOT as hooks.

      /** Returns the accepted (selected) quote object, or null. */
      getSelectedQuote: () => {
        const { quotes, acceptedQuoteId } = get();
        if (!quotes.length || acceptedQuoteId == null) return null;
        return (
          quotes.find((q) => {
            const id = q?.id ?? q?._id ?? q?.quoteId;
            return String(id) === String(acceptedQuoteId);
          }) || null
        );
      },

      /**
       * Gross premium = newTotalPremium from formData
       * (set when a quote is accepted, or entered manually in Step 5).
       */
      getGrossPremium: () => Number(get().formData?.newTotalPremium || 0),

      /**
       * Total collected = sum of all payment history entries.
       * Per spec: sum of "Cleared" payments; in practice all recorded payments
       * are considered collected (status field not enforced in UI).
       */
      getTotalCollected: () =>
        (get().paymentHistory || []).reduce(
          (sum, p) => sum + Number(p.amount || 0),
          0,
        ),

      /** Balance due = grossPremium - totalCollected (never negative). */
      getBalanceDue: () => {
        const gross = get().getGrossPremium();
        const collected = get().getTotalCollected();
        return Math.max(0, gross - collected);
      },

      /**
       * Net margin = sum(receivables net_payout) - sum(payables net_payout).
       * Per spec: totalReceivable × (bankRate + brokerRate)/100, etc.
       * In this implementation the percentage/TDS logic is managed in Step 8
       * and each item already stores net_payout_amount.
       */
      getNetMargin: () => {
        const { formData } = get();
        const receivables = Array.isArray(formData?.insurance_receivables)
          ? formData.insurance_receivables
          : [];
        const payables = Array.isArray(formData?.insurance_payables)
          ? formData.insurance_payables
          : [];
        const totalReceivable = receivables.reduce(
          (s, r) => s + Number(r.net_payout_amount || 0),
          0,
        );
        const totalPayable = payables.reduce(
          (s, p) => s + Number(p.net_payout_amount || 0),
          0,
        );
        return totalReceivable - totalPayable;
      },
    }),
    {
      name: "insurance_case_draft",
      storage: createJSONStorage(() => localStorage),
      // Only persist the data slices, not the action functions
      partialize: (state) => ({
        formData: state.formData,
        quotes: state.quotes,
        acceptedQuoteId: state.acceptedQuoteId,
        documents: state.documents,
        paymentHistory: state.paymentHistory,
        step: state.step,
      }),
    },
  ),
);

export default useInsuranceStore;
