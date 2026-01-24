// src/store/customerStore.js

let customers = [];
let lastId = 1000;

export const getCustomers = () => customers;

export const addCustomer = (data) => {
  const id = data.id || ++lastId;
  const customer = { id, ...data };
  customers = [customer, ...customers];
  return customer;
};

export const updateCustomer = (id, data) => {
  customers = customers.map((c) => (c.id === id ? { ...c, ...data } : c));
};

export const loadDemoCustomers = (demoList) => {
  if (customers.length) return; // important: don't overwrite after first load
  customers = demoList.map((c) => ({ ...c }));
  lastId = demoList.reduce((max, c) => Math.max(max, c.id || 0), 0);
};
