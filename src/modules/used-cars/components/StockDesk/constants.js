export const STOCK_STORAGE_KEY = "acillp_used_car_stock";

export const REFURB_CATEGORIES = {
  AESTHETIC: "Aesthetic / Interior",
  MECHANICAL: "Mechanical / Engine",
  EXTERIOR: "Exterior / Paint",
  LEGAL: "Legal / Transfer",
  OTHR: "Other",
};

export const MOCK_STOCK_INVENTORY = [
  {
    id: "STK-001",
    regNo: "HR 26 DQ 4567",
    make: "Honda",
    model: "City",
    variant: "VX i-VTEC",
    year: 2018,
    fuel: "Petrol",
    purchasePrice: 650000,
    logisticsCost: 4500,
    yardLocation: "Gurgaon Sec-44",
    inStockSince: "2026-03-28",
    status: "REFURBISHMENT",
    thumbnail: "https://images.unsplash.com/photo-1594070319944-7c0c631463e2?auto=format&fit=crop&q=80&w=300",
  },
  {
    id: "STK-002",
    regNo: "DL 3C CJ 8891",
    make: "Hyundai",
    model: "Creta",
    variant: "SX (O)",
    year: 2021,
    fuel: "Diesel",
    purchasePrice: 1120000,
    logisticsCost: 6500,
    yardLocation: "Dwarka Hub",
    inStockSince: "2026-04-05",
    status: "READY_FOR_SALE",
    thumbnail: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&q=80&w=300",
  },
  {
    id: "STK-003",
    regNo: "PB 65 FG 9012",
    make: "Maruti",
    model: "Swift",
    variant: "ZXI+",
    year: 2022,
    fuel: "Petrol",
    purchasePrice: 680000,
    logisticsCost: 3200,
    yardLocation: "Mohali Yard 1",
    inStockSince: "2026-04-12",
    status: "REFURBISHMENT",
    thumbnail: "https://images.unsplash.com/photo-1567818735868-e71b99932e29?auto=format&fit=crop&q=80&w=300",
  }
];

export const getDefaultStockValues = () => ({
  sellingPrice: 0,
  listingReady: false,
  status: "REFURBISHMENT",
  
  // Segment 2: Refurbishment (Workshop Grouped)
  workshops: [
    {
      id: Date.now(),
      name: "",
      contactPerson: "",
      mobile: "",
      workorders: [] // { id, category, work, cost, status }
    }
  ],

  // Segment 3: Challan Management
  challanManagement: {
    deductedAmount: 0,
    ledger: [], // { id, challanNo, amount, date, receiptUploaded }
    screenshots: [],
  },

  // Segment 4: Commission Management
  commission: {
    partyName: "",
    address: "",
    mobile: "",
    amount: 0,
    status: "Pending",
    aadhaarImage: null,
    panImage: null,
  },
});
