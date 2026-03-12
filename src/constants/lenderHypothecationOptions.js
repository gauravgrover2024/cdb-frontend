const CAR_LOAN_BANKS = [
  { name: "Axis Bank", category: "Private Sector Bank" },
  { name: "Bandhan Bank", category: "Private Sector Bank" },
  { name: "City Union Bank", category: "Private Sector Bank" },
  { name: "DCB Bank", category: "Private Sector Bank" },
  { name: "Dhanlaxmi Bank", category: "Private Sector Bank" },
  { name: "Federal Bank", category: "Private Sector Bank" },
  { name: "HDFC Bank", category: "Private Sector Bank" },
  { name: "ICICI Bank", category: "Private Sector Bank" },
  { name: "IDBI Bank", category: "Private Sector Bank" },
  { name: "IDFC FIRST Bank", category: "Private Sector Bank" },
  { name: "IndusInd Bank", category: "Private Sector Bank" },
  { name: "Jammu & Kashmir Bank", category: "Private Sector Bank" },
  { name: "Karnataka Bank", category: "Private Sector Bank" },
  { name: "Karur Vysya Bank", category: "Private Sector Bank" },
  { name: "Kotak Mahindra Bank", category: "Private Sector Bank" },
  { name: "RBL Bank", category: "Private Sector Bank" },
  { name: "South Indian Bank", category: "Private Sector Bank" },
  { name: "YES Bank", category: "Private Sector Bank" },
  { name: "Bank of Baroda", category: "Public Sector Bank" },
  { name: "Bank of India", category: "Public Sector Bank" },
  { name: "Bank of Maharashtra", category: "Public Sector Bank" },
  { name: "Canara Bank", category: "Public Sector Bank" },
  { name: "Central Bank of India", category: "Public Sector Bank" },
  { name: "Indian Bank", category: "Public Sector Bank" },
  { name: "Indian Overseas Bank", category: "Public Sector Bank" },
  { name: "Punjab & Sind Bank", category: "Public Sector Bank" },
  { name: "Punjab National Bank", category: "Public Sector Bank" },
  { name: "State Bank of India", category: "Public Sector Bank" },
  { name: "UCO Bank", category: "Public Sector Bank" },
  { name: "Union Bank of India", category: "Public Sector Bank" },
  { name: "AU Small Finance Bank", category: "Small Finance Bank" },
  { name: "ESAF Small Finance Bank", category: "Small Finance Bank" },
  { name: "Equitas Small Finance Bank", category: "Small Finance Bank" },
  { name: "Jana Small Finance Bank", category: "Small Finance Bank" },
  { name: "Suryoday Small Finance Bank", category: "Small Finance Bank" },
  { name: "Ujjivan Small Finance Bank", category: "Small Finance Bank" },
];

const CAR_LOAN_NBFCS = [
  { name: "Aditya Birla Finance" },
  { name: "Bajaj Finance" },
  { name: "Berar Finance" },
  { name: "Capri Global Capital" },
  { name: "Cholamandalam Investment & Finance" },
  { name: "Clix Capital" },
  { name: "DMI Finance" },
  { name: "Electronica Finance" },
  { name: "Esskay Fincorp" },
  { name: "Fullerton India (SMFG India Credit)" },
  { name: "HDB Financial Services" },
  { name: "Hero FinCorp" },
  { name: "Hinduja Leyland Finance" },
  { name: "IIFL Finance" },
  { name: "InCred Financial Services" },
  { name: "JM Financial Products" },
  { name: "Kotak Mahindra Prime" },
  { name: "L&T Finance" },
  { name: "MAS Financial Services" },
  { name: "Mahindra & Mahindra Financial Services" },
  { name: "Manappuram Finance" },
  { name: "Muthoot Capital Services" },
  { name: "Muthoot Finance" },
  { name: "Navi Finserv" },
  { name: "Northern Arc Capital" },
  { name: "Piramal Capital & Housing Finance" },
  { name: "Poonawalla Fincorp" },
  { name: "Shriram Finance" },
  { name: "Sundaram Finance" },
  { name: "TVS Credit Services" },
  { name: "Tata Capital Financial Services" },
  { name: "Tata Motors Finance" },
  { name: "Toyota Financial Services India" },
  { name: "U GRO Capital" },
  { name: "Veritas Finance" },
  { name: "Vistaar Financial Services" },
  { name: "Vivriti Capital" },
  { name: "Volkswagen Finance Private Limited" },
  { name: "WheelsEMI Private Limited" },
];

const dedupeByName = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item?.name || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const curatedCarLoanBanks = dedupeByName(CAR_LOAN_BANKS);
export const curatedCarLoanNbfcs = dedupeByName(CAR_LOAN_NBFCS);

export const lenderHypothecationOptions = [
  ...curatedCarLoanBanks.map((item) => ({
    value: item.name,
    label: `${item.name} (${item.category})`,
    kind: "Bank",
    category: item.category,
  })),
  ...curatedCarLoanNbfcs.map((item) => ({
    value: item.name,
    label: `${item.name} (NBFC)`,
    kind: "NBFC",
    category: "NBFC",
  })),
].sort((a, b) => a.value.localeCompare(b.value));

