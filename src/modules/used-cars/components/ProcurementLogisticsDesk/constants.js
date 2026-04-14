import { dayjs } from "../UsedCarLeadManager/utils/formatters";

export const PROCUREMENT_STORAGE_KEY = "acillp_procurement_state";

export const PROCUREMENT_STATUS = {
  SCHEDULED: "scheduled",
  OUT_FOR_PICKUP: "out_for_pickup",
  IN_TRANSIT: "in_transit",
  YARD_ARRIVED: "yard_arrived",
  COMPLETED: "completed",
};

export const YARD_LOCATIONS = [
  { id: "Y001", name: "Delhi North Yard (Burari)", capacity: "85%", manager: "Rahul Sharma" },
  { id: "Y002", name: "Gurgaon Hub (Sector 34)", capacity: "42%", manager: "Amit Goel" },
  { id: "Y003", name: "Noida Sector 63 Yard", capacity: "91%", manager: "Vikram Negi" },
  { id: "Y004", name: "Faridabad Central Yard", capacity: "15%", manager: "Sanjay Dutta" },
];

export const LOGISTICS_DRIVERS = [
  { id: "D101", name: "Karan Singh", phone: "9812345678", rating: 4.8 },
  { id: "D102", name: "Mohit Kumar", phone: "9876543210", rating: 4.5 },
  { id: "D103", name: "Rajesh Yadav", phone: "9988776655", rating: 4.9 },
  { id: "D104", name: "Suresh Pal", phone: "9554433221", rating: 4.2 },
];

export const MOCK_PROCUREMENT_LEADS = [
  {
    id: "L1003",
    regNo: "PB 65 FG 9012",
    make: "Honda",
    model: "City",
    variant: "ZX",
    mfgYear: 2018,
    name: "Vikram Singh",
    phone: "91234 56789",
    customerDemand: 680000,
    finalPrice: 500000,
    margin: 180000,
    sourcingHub: "Delhi",
    negotiationStatus: "Ready for Procurement",
    ownershipType: "Company",
    vahanStatus: "Verified",
    inspectionReport: "Verified",
    pickupLocation: "Civil Lines, Delhi",
    tags: ["High Margin", "Ready"],
  },
  {
    id: "L1001",
    regNo: "DL 1C AC 1234",
    make: "Maruti",
    model: "Swift",
    variant: "VXi",
    mfgYear: 2021,
    name: "John Doe",
    phone: "98765 43210",
    customerDemand: 550000,
    finalPrice: 485000,
    margin: 65000,
    sourcingHub: "Gurgaon",
    negotiationStatus: "Ready for Procurement",
    ownershipType: "Individual",
    vahanStatus: "Verified",
    inspectionReport: "Verified",
    pickupLocation: "Sector 45, Gurgaon",
    tags: ["Quick Pickup"],
  },
];

export const PAYMENT_TYPE_OPTS = [
  { value: "Token", label: "Token" },
  { value: "Loan Closure", label: "Loan Closure (Foreclosure)" },
  { value: "Balance Payment", label: "Balance Payment" },
  { value: "Holdback Release", label: "Holdback Release" },
];

export const getDefaultProcurementValues = () => ({
  logistics: {
    executiveId: null,
    pickupTime: null,
    docsSigned: "No",
  },
  assets: {
    physicalRC: false,
    originalKeys: 0, // 0, 1, 2
    serviceBooklet: false,
    spareTyreState: "present", // present, missing, damaged
    ownersManual: false,
    handoffChecklist: {}, // Dynamic keys for Company vs Individual
  },
  payment: {
    records: [], // Array of { id, amount, type, utn, date }
    status: "pending", // matched, pending
    remarks: "",
  },
});
