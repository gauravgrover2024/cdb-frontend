import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import QuickActionToolbar from "../../../components/ui/QuickActionToolbar";
import HorizontalFilterBar from "./dashboard/HorizontalFilterBar";
import LoansDataGrid from "./dashboard/LoansDataGrid";
import LoanViewModal from "./dashboard/LoanViewModal";
import LoansDashboardStats from "./dashboard/LoansDashboardStats";
import Input from "../../../components/ui/Input";

const LoanDashboard = () => {
  const navigate = useNavigate();
  const [previewPanelOpen, setPreviewPanelOpen] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedLoans, setSelectedLoans] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    loanTypes: [],
    stages: [],
    statuses: [],
    agingBuckets: [],
    amountRanges: [],
  });

  const userRole = "admin";

  // Mock loan data - replace with actual API call
  const mockLoans = [
    // ===== DISBURSED LOANS (3) =====
    {
      id: 7,
      loanId: "LN-2026-007",
      // Customer fields
      customerName: "Rahul Mehta",
      primaryMobile: "9999900007",
      email: "rahul.mehta@email.com",
      motherName: "Geeta Mehta",
      sdwOf: "Suresh Mehta",
      dob: "1982-09-05",
      gender: "Male",
      maritalStatus: "Married",
      dependents: 2,
      education: "postgraduate",
      houseType: "owned",
      addressType: "residential",
      residenceAddress: "45, Lokhandwala Complex, Andheri West",
      pincode: "400053",
      city: "Mumbai",
      yearsInCurrentCity: 25,
      yearsInCurrentHouse: 12,

      // Vehicle fields
      vehicleMake: "Toyota",
      vehicleModel: "Fortuner",
      vehicleVariant: "Legender Diesel",
      typeOfLoan: "New Car",
      usage: "Private",
      exShowroomPrice: 3600000,
      insuranceCost: 95000,
      roadTax: 185000,
      accessoriesAmount: 75000,
      dealerDiscount: 120000,
      manufacturerDiscount: 185000,
      marginMoney: 750000,
      dealerName: "Toyota Showroom Mumbai",
      dealerContactPerson: "Suresh Kumar",
      dealerContactNumber: "9898989807",
      dealerAddress: "Andheri-Kurla Road, Mumbai, MH - 400059",
      registerSameAsAadhaar: "Yes",

      // Employment fields
      applicantType: "Individual",
      occupationType: "Self Employed",
      companyType: "Private Limited",
      businessNature: ["Real Estate", "Construction"],
      designation: "Director",
      experienceCurrent: "15",
      totalExperience: "18",
      companyName: "Mehta Constructions Pvt Ltd",
      employmentAddress: "BKC, Bandra East, Mumbai",
      employmentPincode: "400051",
      employmentCity: "Mumbai",
      monthlySalary: 350000,
      otherIncome: 50000,
      otherIncomeSource: "Rental + Dividends",

      // Bank fields
      accountNumber: "1234567890123407",
      bankName: "HDFC Bank",
      branch: "Andheri West",
      accountSinceYears: 18,
      openedIn: 2008,
      accountType: "Current",

      // References
      reference1: {
        name: "Ajay Kapoor",
        mobile: "9999900022",
        address: "123, Juhu Scheme, Mumbai",
        pincode: "400049",
        city: "Mumbai",
      },
      reference2: {
        name: "Kavita Singhania",
        mobile: "9999900023",
        address: "67, Versova, Mumbai",
        pincode: "400061",
        city: "Mumbai",
      },

      // Approval fields
      approval_bankId: Date.now() + 4,
      approval_approvalDate: "2025-12-28T09:30:00.000Z",
      approval_bankName: "SBI",
      approval_status: "Disbursed",
      approval_loanAmountApproved: 3250000,
      approval_loanAmountDisbursed: 3250000,
      approval_roi: 8.2,
      approval_tenureMonths: 84,
      approval_processingFees: 32500,
      approval_disbursedDate: "2026-01-05T10:00:00.000Z",
      approval_breakup_netLoanApproved: 3220000,
      approval_breakup_creditAssured: 10000,
      approval_breakup_insuranceFinance: 10000,
      approval_breakup_ewFinance: 10000,
      approval_statusHistory: [
        {
          status: "Pending",
          changedAt: "2025-12-23T08:00:00.000Z",
          note: "Bank added",
        },
        {
          status: "Approved",
          changedAt: "2025-12-28T09:30:00.000Z",
          note: "High value loan approved",
        },
        {
          status: "Disbursed",
          changedAt: "2026-01-05T10:00:00.000Z",
          note: "Funds disbursed",
        },
      ],

      // Post-File fields
      postfile_approvalDate: "2025-12-28",
      postfile_bankName: "SBI",
      postfile_loanAmountDisbursed: 3250000,
      postfile_roi: 8.2,
      postfile_tenureMonths: 84,
      postfile_processingFees: 32500,
      postfile_roiType: "Fixed",
      postfile_emiMode: "Arrear",
      postfile_emiPlan: "Normal",
      postfile_emiAmount: 50800,
      postfile_firstEmiDate: "2026-02-05",
      postfile_disbursedLoan: 3220000,
      postfile_disbursedCreditAssured: 10000,
      postfile_disbursedInsurance: 10000,
      postfile_disbursedEw: 10000,
      postfile_regd_city: "Mumbai",
      __postfileSeeded: true,

      // Instrument fields
      instrumentType: "ECS",
      ecs_micrCode: "400240001",
      ecs_bankName: "HDFC Bank",
      ecs_accountNumber: "1234567890123407",
      ecs_date: "2026-02-05",
      ecs_amount: 50800,
      ecs_tag: "Monthly EMI",
      ecs_favouring: "SBI Auto Loans",
      ecs_signedBy: "Applicant",

      // Dispatch fields
      dispatch_date: "2026-01-05",
      dispatch_time: "15:30",
      dispatch_through: "Courier",
      disbursement_date: "2026-01-05",
      disbursement_time: "10:00",
      loan_number: "SBI-AL-2026-45678",
      docs_prepared_by: "Rahul Verma",
      __dispatchInitialized: true,

      // Delivery fields
      delivery_date: "2026-01-15",
      delivery_dealerName: "Toyota Showroom Mumbai",
      delivery_dealerContactPerson: "Suresh Kumar",
      delivery_dealerContactNumber: "9898989807",
      delivery_dealerAddress: "Andheri-Kurla Road, Mumbai, MH - 400059",
      delivery_by: "Showroom Manager",
      insurance_by: "Autocredits India LLP",
      insurance_company_name: "ICICI Lombard",
      insurance_policy_number: "TOY2026001234",
      invoice_number: "INV-TOY-2026-001",
      invoice_date: "2026-01-15",
      invoice_received_as: "Original",
      invoice_received_from: "Dealer",
      invoice_received_date: "2026-01-15",
      rc_redg_no: "MH02BZ5678",
      rc_chassis_no: "MALEZ84A100012345",
      rc_engine_no: "2GDF1234567",
      rc_redg_date: "2026-01-15",
      rc_received_as: "Original",
      rc_received_from: "RTO Mumbai",
      rc_received_date: "2026-01-15",
      __deliveryInitialized: true,

      // Loan status fields
      loanAmount: 3250000,
      bankName: "SBI",
      currentStage: "delivery",
      status: "Disbursed",
      aging: 25,
      priority: "high",
      isFinanced: "Yes",
      roi: 8.2,
      tenure: 84,
      emi: 50800,
      processingFee: 32500,
      downPayment: 750000,
      nextAction: {
        label: "Complete Delivery Documentation",
        icon: "Truck",
        dueDate: "18 Jan 2026",
      },
      stagesCompleted: ["profile", "prefile", "approval", "postfile"],
      profileCompletedDate: "20 Dec 2025",
      prefileCompletedDate: "23 Dec 2025",
      approvalCompletedDate: "28 Dec 2025",
      postfileCompletedDate: "05 Jan 2026",

      // Record fields
      receivingDate: "2025-12-20",
      recordSource: "Direct",
      dealtBy: "Senior Manager",
      sourceName: "Premium Customer",
    },
    {
      id: 8,
      loanId: "LN-2026-008",
      // Customer fields
      customerName: "Kavita Joshi",
      primaryMobile: "9999900008",
      email: "kavita.joshi@email.com",
      motherName: "Rekha Joshi",
      sdwOf: "Anil Joshi",
      dob: "1989-12-03",
      gender: "Female",
      maritalStatus: "Married",
      dependents: 1,
      education: "graduate",
      houseType: "owned",
      addressType: "residential",
      residenceAddress: "234, Vaishali Nagar, Jaipur",
      pincode: "302021",
      city: "Jaipur",
      yearsInCurrentCity: 30,
      yearsInCurrentHouse: 8,

      // Vehicle fields
      vehicleMake: "Volkswagen",
      vehicleModel: "Taigun",
      vehicleVariant: "GT TSI",
      typeOfLoan: "New Car",
      usage: "Private",
      exShowroomPrice: 1600000,
      insuranceCost: 62000,
      roadTax: 95000,
      accessoriesAmount: 38000,
      dealerDiscount: 60000,
      manufacturerDiscount: 80000,
      marginMoney: 375000,
      dealerName: "Volkswagen Showroom Jaipur",
      dealerContactPerson: "Sandeep Rathore",
      dealerContactNumber: "9898989808",
      dealerAddress: "Tonk Road, Jaipur, RJ - 302015",
      registerSameAsAadhaar: "No",

      // Employment fields
      applicantType: "Individual",
      occupationType: "Salaried",
      companyType: "Government",
      designation: "Assistant Professor",
      experienceCurrent: "8",
      totalExperience: "10",
      companyName: "Rajasthan University",
      employmentAddress: "JLN Marg, Jaipur",
      employmentPincode: "302004",
      employmentCity: "Jaipur",
      monthlySalary: 125000,
      otherIncome: 18000,
      otherIncomeSource: "Tuitions",

      // Bank fields
      accountNumber: "1234567890123408",
      bankName: "State Bank of India",
      branch: "Vaishali Nagar",
      accountSinceYears: 10,
      openedIn: 2016,
      accountType: "Savings",

      // References
      reference1: {
        name: "Manoj Sharma",
        mobile: "9999900024",
        address: "56, C-Scheme, Jaipur",
        pincode: "302001",
        city: "Jaipur",
      },
      reference2: {
        name: "Sunita Agarwal",
        mobile: "9999900025",
        address: "78, Malviya Nagar, Jaipur",
        pincode: "302017",
        city: "Jaipur",
      },

      // Approval fields
      approval_bankId: Date.now() + 5,
      approval_approvalDate: "2026-01-08T13:15:00.000Z",
      approval_bankName: "Kotak Mahindra Bank",
      approval_status: "Disbursed",
      approval_loanAmountApproved: 1425000,
      approval_loanAmountDisbursed: 1425000,
      approval_roi: 8.0,
      approval_tenureMonths: 72,
      approval_processingFees: 14250,
      approval_disbursedDate: "2026-01-14T11:00:00.000Z",
      approval_breakup_netLoanApproved: 1395000,
      approval_breakup_creditAssured: 10000,
      approval_breakup_insuranceFinance: 10000,
      approval_breakup_ewFinance: 10000,
      approval_statusHistory: [
        {
          status: "Pending",
          changedAt: "2026-01-05T09:00:00.000Z",
          note: "Bank added",
        },
        {
          status: "Approved",
          changedAt: "2026-01-08T13:15:00.000Z",
          note: "Approved",
        },
        {
          status: "Disbursed",
          changedAt: "2026-01-14T11:00:00.000Z",
          note: "Disbursement completed",
        },
      ],

      // Post-File fields
      postfile_approvalDate: "2026-01-08",
      postfile_bankName: "Kotak Mahindra Bank",
      postfile_loanAmountDisbursed: 1425000,
      postfile_roi: 8.0,
      postfile_tenureMonths: 72,
      postfile_processingFees: 14250,
      postfile_roiType: "Floating",
      postfile_emiMode: "Advance",
      postfile_emiPlan: "Normal",
      postfile_emiAmount: 23500,
      postfile_firstEmiDate: "2026-02-10",
      postfile_disbursedLoan: 1395000,
      postfile_disbursedCreditAssured: 10000,
      postfile_disbursedInsurance: 10000,
      postfile_disbursedEw: 10000,
      postfile_regd_city: "Jaipur",
      __postfileSeeded: true,

      // Instrument fields
      instrumentType: "SI",
      si_accountNumber: "1234567890123408",
      si_signedBy: "Applicant",

      // Dispatch fields
      dispatch_date: "2026-01-14",
      dispatch_time: "16:00",
      dispatch_through: "Hand Delivered",
      disbursement_date: "2026-01-14",
      disbursement_time: "11:00",
      loan_number: "KOTAK-AL-2026-78901",
      docs_prepared_by: "Neha Kapoor",
      __dispatchInitialized: true,

      // Delivery fields
      delivery_date: "2026-01-16",
      delivery_dealerName: "Volkswagen Showroom Jaipur",
      delivery_dealerContactPerson: "Sandeep Rathore",
      delivery_dealerContactNumber: "9898989808",
      delivery_dealerAddress: "Tonk Road, Jaipur, RJ - 302015",
      delivery_by: "Dealer Representative",
      insurance_by: "Autocredits India LLP",
      insurance_company_name: "Bajaj Allianz",
      insurance_policy_number: "VW2026005678",
      invoice_number: "INV-VW-2026-002",
      invoice_date: "2026-01-16",
      invoice_received_as: "Original",
      invoice_received_from: "Dealer",
      invoice_received_date: "2026-01-16",
      rc_redg_no: "RJ14CD9012",
      rc_chassis_no: "WVWZZZ3CZ12345678",
      rc_engine_no: "CHZ123456",
      rc_redg_date: "2026-01-16",
      rc_received_as: "Photocopy",
      rc_received_from: "RTO Jaipur",
      rc_received_date: "2026-01-16",
      __deliveryInitialized: true,

      // Loan status fields
      loanAmount: 1425000,
      bankName: "Kotak Mahindra Bank",
      currentStage: "delivery",
      status: "Disbursed",
      aging: 6,
      priority: "normal",
      isFinanced: "Yes",
      roi: 8.0,
      tenure: 72,
      emi: 23500,
      processingFee: 14250,
      downPayment: 375000,
      nextAction: {
        label: "Handover Vehicle",
        icon: "Key",
        dueDate: "17 Jan 2026",
      },
      stagesCompleted: ["profile", "prefile", "approval", "postfile"],
      profileCompletedDate: "05 Jan 2026",
      prefileCompletedDate: "08 Jan 2026",
      approvalCompletedDate: "08 Jan 2026",
      postfileCompletedDate: "14 Jan 2026",

      // Record fields
      receivingDate: "2026-01-05",
      recordSource: "Direct",
      dealtBy: "Branch Head",
      sourceName: "Existing Customer",
    },
    {
      id: 12,
      loanId: "CS-2026-003",
      // Customer fields
      customerName: "Sandeep Nair",
      primaryMobile: "9999900012",
      email: "sandeep.nair@email.com",
      motherName: "Radha Nair",
      sdwOf: "Krishnan Nair",
      dob: "1988-05-07",
      gender: "Male",
      maritalStatus: "Married",
      dependents: 1,
      education: "graduate",
      houseType: "owned",
      addressType: "residential",
      residenceAddress: "78, Marine Drive, Kochi",
      pincode: "682031",
      city: "Kochi",
      yearsInCurrentCity: 34,
      yearsInCurrentHouse: 8,

      // Vehicle fields
      vehicleMake: "Kia",
      vehicleModel: "Carens",
      vehicleVariant: "Prestige Plus 7-Seater",
      typeOfLoan: "New Car",
      usage: "Private",
      exShowroomPrice: 1800000,
      insuranceCost: 68000,
      roadTax: 105000,
      accessoriesAmount: 40000,
      dealerDiscount: 50000,
      manufacturerDiscount: 73000,
      marginMoney: 0,
      dealerName: "Kia Showroom Kochi",
      dealerContactPerson: "Thomas George",
      dealerContactNumber: "9898989812",
      dealerAddress: "MG Road, Kochi, KL - 682016",
      registerSameAsAadhaar: "No",

      // Delivery fields
      delivery_date: "2026-01-14",
      delivery_dealerName: "Kia Showroom Kochi",
      delivery_dealerContactPerson: "Thomas George",
      delivery_dealerContactNumber: "9898989812",
      delivery_dealerAddress: "MG Road, Kochi, KL - 682016",
      delivery_by: "Customer Service Manager",
      insurance_by: "Broker",
      insurance_company_name: "New India Assurance",
      insurance_policy_number: "KIA2026003333",
      invoice_number: "INV-KIA-2026-003",
      invoice_date: "2026-01-14",
      invoice_received_as: "Original",
      invoice_received_from: "Dealer",
      invoice_received_date: "2026-01-14",
      rc_redg_no: "KL07GH7890",
      rc_chassis_no: "MALA5J1JXNF123456",
      rc_engine_no: "G4KJNA789012",
      rc_redg_date: "2026-01-14",
      rc_received_as: "Photocopy",
      rc_received_from: "RTO Kochi",
      rc_received_date: "2026-01-14",
      __deliveryInitialized: true,

      // Loan status fields (Cash sale)
      loanAmount: 0,
      bankName: null,
      currentStage: "delivery",
      status: "Completed",
      aging: 3,
      priority: "normal",
      isFinanced: "No",
      nextAction: {
        label: "Case Closed",
        icon: "CheckCircle",
        dueDate: null,
      },
      stagesCompleted: ["profile", "delivery"],
      profileCompletedDate: "12 Jan 2026",
      deliveryCompletedDate: "14 Jan 2026",

      // Record fields
      receivingDate: "2026-01-12",
      recordSource: "Direct",
      dealtBy: "Floor Manager",
      sourceName: "Festival Campaign",
    },
  ];

  const [loans, setLoans] = useState([]);

  // Load loans on mount
  useEffect(() => {
    const loadLoans = () => {
      const savedLoans = JSON.parse(localStorage.getItem("savedLoans") || "[]");
      console.log("Loading saved loans from localStorage:", savedLoans);

      const calculateAging = (createdAt) => {
        if (!createdAt) return 0;
        const created = new Date(createdAt);
        const now = new Date();
        const diffTime = Math.abs(now - created);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      };

      const transformedSavedLoans = savedLoans.map((loan) => ({
        ...loan,
        aging: loan.aging || calculateAging(loan.createdAt),
        status: loan.approval_status || loan.status || "Pending",
        vehicleMake: loan.vehicleMake || "",
        vehicleModel: loan.vehicleModel || "",
        vehicleVariant: loan.vehicleVariant || "",
        loanAmount: loan.approval_loanAmountApproved || loan.loanAmount || 0,
        bankName: loan.approval_bankName || loan.bankName || null,
      }));

      const allLoans = [...transformedSavedLoans, ...mockLoans];

      const uniqueLoans = allLoans.reduce((acc, loan) => {
        if (!acc.find((l) => l.loanId === loan.loanId)) {
          acc.push(loan);
        }
        return acc;
      }, []);

      const existingSaved = JSON.parse(
        localStorage.getItem("savedLoans") || "[]"
      );

      if (existingSaved.length === 0) {
        localStorage.setItem("savedLoans", JSON.stringify(mockLoans));
      }

      console.log("Total loans loaded:", uniqueLoans.length);
      setLoans(uniqueLoans);
    };

    loadLoans();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setPreviewPanelOpen(false);
      } else {
        setPreviewPanelOpen(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Reload loans when coming back to dashboard
  useEffect(() => {
    const handleFocus = () => {
      const savedLoans = JSON.parse(localStorage.getItem("savedLoans") || "[]");

      const calculateAging = (createdAt) => {
        if (!createdAt) return 0;
        const created = new Date(createdAt);
        const now = new Date();
        const diffTime = Math.abs(now - created);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      };

      const transformedSavedLoans = savedLoans.map((loan) => ({
        ...loan,
        aging: loan.aging || calculateAging(loan.createdAt),
        status: loan.approval_status || loan.status || "Pending",
        loanAmount: loan.approval_loanAmountApproved || loan.loanAmount || 0,
        bankName: loan.approval_bankName || loan.bankName || null,
      }));

      const allLoans = [...transformedSavedLoans, ...mockLoans];
      const uniqueLoans = allLoans.reduce((acc, loan) => {
        if (!acc.find((l) => l.loanId === loan.loanId)) {
          acc.push(loan);
        }
        return acc;
      }, []);

      setLoans(uniqueLoans);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      loanTypes: [],
      stages: [],
      statuses: [],
      agingBuckets: [],
      amountRanges: [],
    });
  };

  const handleSelectLoan = (loanId, checked) => {
    setSelectedLoans((prev) =>
      checked ? [...prev, loanId] : prev?.filter((id) => id !== loanId)
    );
  };

  const handleSelectAll = (checked) => {
    setSelectedLoans(checked ? loans?.map((l) => l?.id) : []);
  };

  const handleLoanClick = (loan, mode) => {
    if (mode === "edit") {
      handleNavigateToLoan(loan);
    } else {
      setSelectedLoan(loan);
    }
  };

  const handleBulkAction = (action) => {
    console.log("Bulk action:", action, "on loans:", selectedLoans);
  };

  const handleQuickAction = (actionId) => {
    console.log("Quick action:", actionId);
    if (actionId === "new-case") {
      localStorage.removeItem("editingLoan");
      localStorage.removeItem("editingLoanId");
      localStorage.removeItem("loanDraft"); // ✅ ADD THIS
      navigate("/loans/new");
    }
  };

  const handleNavigateToLoan = (loan) => {
    // Store the loan data in localStorage for editing
    localStorage.setItem("editingLoan", JSON.stringify(loan));
    localStorage.setItem("editingLoanId", loan.id);

    // Navigate to the loan form in edit mode
    navigate(`/loans/edit/${loan.id}`);
  };

  // Apply filters
  const filteredLoans = loans?.filter((loan) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery?.toLowerCase();
      const matchesSearch =
        loan?.loanId?.toLowerCase()?.includes(query) ||
        loan?.customerName?.toLowerCase()?.includes(query) ||
        loan?.vehicleModel?.toLowerCase()?.includes(query) ||
        loan?.vehicleMake?.toLowerCase()?.includes(query);
      if (!matchesSearch) return false;
    }

    // Loan Type filter
    if (
      filters?.loanTypes?.length > 0 &&
      !filters?.loanTypes?.includes(loan?.loanType)
    ) {
      return false;
    }

    // Stage filter
    if (
      filters?.stages?.length > 0 &&
      !filters?.stages?.includes(loan?.currentStage)
    ) {
      return false;
    }

    // Status filter
    if (
      filters?.statuses?.length > 0 &&
      !filters?.statuses?.includes(loan?.status?.toLowerCase())
    ) {
      return false;
    }

    // Aging filter
    if (filters?.agingBuckets?.length > 0) {
      const aging = loan?.aging;
      const matchesBucket = filters?.agingBuckets?.some((bucket) => {
        if (bucket === "0-7") return aging >= 0 && aging <= 7;
        if (bucket === "8-15") return aging >= 8 && aging <= 15;
        if (bucket === "16-30") return aging >= 16 && aging <= 30;
        if (bucket === "31-60") return aging >= 31 && aging <= 60;
        if (bucket === "60+") return aging > 60;
        return false;
      });
      if (!matchesBucket) return false;
    }

    // Amount filter
    if (filters?.amountRanges?.length > 0) {
      const amount = loan?.loanAmount / 100000; // Convert to lakhs
      const matchesRange = filters?.amountRanges?.some((range) => {
        if (range === "0-5") return amount >= 0 && amount < 5;
        if (range === "5-10") return amount >= 5 && amount < 10;
        if (range === "10-15") return amount >= 10 && amount < 15;
        if (range === "15-20") return amount >= 15 && amount < 20;
        if (range === "20+") return amount >= 20;
        return false;
      });
      if (!matchesRange) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-foreground mb-2">
              Loans Dashboard
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Manage and track all loan applications
            </p>
          </div>

          <QuickActionToolbar onAction={handleQuickAction} />
        </div>

        {/* Stats */}
        <LoansDashboardStats loans={loans} />

        {/* Main Content */}
        <div className="bg-card border border-border rounded-lg p-4 md:p-6">
          {/* Search & Toggle Preview */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div className="flex-1 w-full md:max-w-md">
              <Input
                type="search"
                placeholder="Search by Loan ID, Customer, or Vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e?.target?.value)}
              />
            </div>

            <div className="flex items-center gap-2"></div>
          </div>

          {/* ADD THIS LINE ↓ */}
          <HorizontalFilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
          />

          {/* Data Grid with Preview Panel */}
          <div
            className="flex gap-6"
            style={{ height: "calc(100vh - 520px)", minHeight: "600px" }}
          >
            <div className="flex-1 min-w-0">
              <LoansDataGrid
                loans={filteredLoans}
                selectedLoans={selectedLoans}
                onSelectLoan={handleSelectLoan}
                onSelectAll={handleSelectAll}
                onLoanClick={handleLoanClick}
                onBulkAction={handleBulkAction}
                userRole={userRole}
              />
            </div>
          </div>
        </div>
      </div>
      {/* ADD THIS HERE ↓ */}
      <LoanViewModal
        open={!!selectedLoan}
        loan={selectedLoan}
        onClose={() => setSelectedLoan(null)}
        onEdit={(loan) => handleNavigateToLoan(loan)}
      />
    </div>
  );
};

export default LoanDashboard;
