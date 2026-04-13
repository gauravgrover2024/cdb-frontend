export const NEGOTIATION_STORAGE_KEY = "used_cars_negotiation_data";

export const NEGOTIATION_STATUS = {
  PENDING: "Pending Quotations",
  NEGOTIATING: "Under Negotiation",
  AWAITING_APPROVAL: "Awaiting Approval",
  APPROVED: "Approved",
  CLOSED: "Ready for Procurement",
  LOST: "Lost / Declined",
};

export const VERIFIED_VENDORS = [
  { 
    id: "V001", 
    name: "Acme Motors", 
    contact: "9812345670", 
    location: "Sohna Road, Gurgaon",
    avgIncrementPercent: 8.5
  },
  { 
    id: "V002", 
    name: "Capital Cars", 
    contact: "9988776655", 
    location: "Dwarka Sector 10, Delhi",
    avgIncrementPercent: 12.2
  },
  { 
    id: "V003", 
    name: "Exotic Wheels", 
    contact: "9123456789", 
    location: "Indirapuram, Noida",
    avgIncrementPercent: 5.0
  },
  { 
    id: "V004", 
    name: "Signature Auto", 
    contact: "8800112233", 
    location: "Okhla Phase 3, Delhi",
    avgIncrementPercent: 15.4
  },
];

export const STAFF_MEMBERS = [
  "Amit Kumar",
  "Rohan Sharma",
  "Priya Singh",
  "Suresh Raina",
  "Deepak Gupta",
];

export const getDefaultNegotiationValues = () => ({
  customerDemand: null,
  targetPrice: null,
  customerNegotiation: {
    priceTimeline: [], // Array of { price, timestamp }
  },
  quotations: [
    { 
      dealerName: "", 
      contactNumber: "", 
      location: "", 
      quotedPrice: null,
      sourcedBy: "",
      priceTimeline: [] // Array of { price, timestamp }
    },
  ],
  negotiationStatus: NEGOTIATION_STATUS.PENDING,
  comments: "",
});

export const MOCK_BGC_CLEARED_LEADS = [
  {
    id: "L1001",
    regNo: "DL 1C AC 1234",
    name: "John Doe",
    make: "Maruti",
    model: "Swift",
    variant: "VXi",
    mfgYear: 2021,
    inspectionScore: 8.5,
    bgcStatus: "Cleared",
    tags: ["High Priority"],
    customerDemand: 550000,
  },
  {
    id: "L1002",
    regNo: "HR 26 BD 5678",
    name: "Anita Sharma",
    make: "Hyundai",
    model: "Creta",
    variant: "SX(O)",
    mfgYear: 2022,
    inspectionScore: 9.2,
    bgcStatus: "Cleared",
    tags: ["Hot Lead"],
    customerDemand: 1650000,
  },
  {
    id: "L1003",
    regNo: "PB 65 FG 9012",
    name: "Vikram Singh",
    make: "Honda",
    model: "City",
    variant: "ZX",
    mfgYear: 2018,
    inspectionScore: 7.8,
    bgcStatus: "Cleared",
    tags: ["Urgent Sell"],
    customerDemand: 680000,
  },
];
