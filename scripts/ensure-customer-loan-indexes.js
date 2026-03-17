/* eslint-disable no-console */
const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || process.env.REACT_APP_MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is required");
  process.exit(1);
}

const getDbNameFromUri = (uri) => {
  try {
    const u = new URL(uri);
    const pathname = (u.pathname || "").replace(/^\//, "");
    return pathname || "test";
  } catch {
    return "test";
  }
};

async function ensureIndexes() {
  const client = new MongoClient(MONGO_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 15000,
  });

  try {
    await client.connect();
    const dbName = getDbNameFromUri(MONGO_URI);
    const db = client.db(dbName);
    const customers = db.collection("customers");
    const loans = db.collection("loans");

    const customerIndexSpecs = [
      [{ customerId: 1 }, { name: "idx_customer_customerId", unique: true, sparse: true }],
      [{ updatedAt: -1, _id: -1 }, { name: "idx_customer_updatedAt" }],
      [{ createdAt: -1, _id: -1 }, { name: "idx_customer_createdAt" }],
      [{ customerName: 1 }, { name: "idx_customer_name" }],
      [{ primaryMobile: 1 }, { name: "idx_customer_primaryMobile" }],
      [{ panNumber: 1 }, { name: "idx_customer_pan" }],
      [{ aadharNumber: 1 }, { name: "idx_customer_aadhar" }],
      [{ aadhaarNumber: 1 }, { name: "idx_customer_aadhaar" }],
      [{ city: 1 }, { name: "idx_customer_city" }],
      [{ customerType: 1, kycStatus: 1, updatedAt: -1 }, { name: "idx_customer_type_kyc_updatedAt" }],
      [
        { customerName: "text", primaryMobile: "text", panNumber: "text", city: "text", customerId: "text" },
        { name: "idx_customer_text_search", default_language: "none" },
      ],
    ];

    const loanIndexSpecs = [
      [{ customerId: 1, updatedAt: -1 }, { name: "idx_loan_customer_updatedAt" }],
      [{ customerId: 1, createdAt: -1 }, { name: "idx_loan_customer_createdAt" }],
    ];

    console.log(`[indexes] using db="${dbName}"`);

    for (const [spec, options] of customerIndexSpecs) {
      await customers.createIndex(spec, options);
      console.log(`[indexes] customers ${options.name}`);
    }

    for (const [spec, options] of loanIndexSpecs) {
      await loans.createIndex(spec, options);
      console.log(`[indexes] loans ${options.name}`);
    }

    console.log("[indexes] completed");
  } finally {
    await client.close();
  }
}

ensureIndexes().catch((error) => {
  console.error("[indexes] failed:", error?.message || error);
  process.exit(1);
});

