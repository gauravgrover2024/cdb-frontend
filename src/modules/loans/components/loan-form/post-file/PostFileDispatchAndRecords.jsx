import React, { useState, useEffect } from "react";
import { Form } from "antd";
import Icon from "../../../../../components/AppIcon";

const MOCK_EMPLOYEES = [
  "Rajesh Kumar",
  "Priya Patel",
  "Amit Sharma",
  "Sneha Reddy",
  "Vikram Singh",
  "Anita Desai",
  "Rahul Verma",
  "Pooja Gupta",
  "Karan Mehta",
  "Neha Joshi",
];

const PostFileDispatchAndRecords = ({ form }) => {
  // Initialize disbursement date & time with current date/time
  useEffect(() => {
    const alreadyInitialized = form.getFieldValue("__dispatchInitialized");
    if (alreadyInitialized) return;

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().slice(0, 5); // HH:MM

    form.setFieldsValue({
      disbursement_date: dateStr,
      disbursement_time: timeStr,
      __dispatchInitialized: true,
    });
  }, [form]);
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Dispatch Details Section */}
      <div className="bg-card rounded-lg shadow-elevation-2 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="Send" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground">
              Dispatch Details
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              Document dispatch and disbursement information
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Form.Item
              label="Dispatch Date"
              name="dispatch_date"
              className="mb-0"
            >
              <input
                type="date"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
            </Form.Item>

            <Form.Item
              label="Dispatch Time"
              name="dispatch_time"
              className="mb-0"
            >
              <input
                type="time"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
            </Form.Item>

            <Form.Item
              label="Dispatch Through"
              name="dispatch_through"
              className="mb-0"
            >
              <input
                type="text"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                placeholder="e.g., Courier, Email"
              />
            </Form.Item>

            <Form.Item
              label="Disbursement Date"
              name="disbursement_date"
              className="mb-0"
            >
              <input
                type="date"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Form.Item
              label="Disbursement Time"
              name="disbursement_time"
              className="mb-0"
            >
              <input
                type="time"
                className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
              />
            </Form.Item>

            <Form.Item label="Loan Number" name="loan_number" className="mb-0">
              <div className="relative">
                <input
                  type="text"
                  className="w-full border border-dashed border-warning/40 rounded-md px-2 py-1 text-sm bg-warning/5"
                  placeholder="Pending..."
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Icon name="Clock" size={14} className="text-warning" />
                </div>
              </div>
            </Form.Item>
          </div>

          <div className="p-3 bg-info/10 rounded-md border border-info/20">
            <p className="text-xs text-info flex items-center gap-2">
              <Icon name="Info" size={14} />
              <span>Loan number will be assigned after final approval</span>
            </p>
          </div>
        </div>
      </div>
      {/* Record Details Section */}
      <div className="bg-card rounded-lg shadow-elevation-2 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="FileCheck" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground">
              Record Details
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              Document preparation information
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EmployeeAutosuggest
            label="Docs Prepared By"
            name="docs_prepared_by"
            form={form}
            employees={MOCK_EMPLOYEES}
          />
        </div>
      </div>
    </div>
  );
};
const EmployeeAutosuggest = ({ label, name, form, employees }) => {
  const [inputValue, setInputValue] = useState(form.getFieldValue(name) || "");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredEmployees = employees.filter((emp) =>
    emp.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelect = (employee) => {
    setInputValue(employee);
    form.setFieldsValue({ [name]: employee });
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <label className="text-xs text-muted-foreground mb-1 block">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background pr-8"
          placeholder="Type employee name..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            form.setFieldsValue({ [name]: e.target.value });
            setShowSuggestions(e.target.value.length > 0);
          }}
          onFocus={() => inputValue && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        <Icon
          name="User"
          size={14}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredEmployees.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto z-10">
            {filteredEmployees.map((emp, index) => (
              <div
                key={index}
                className="px-3 py-2 text-sm hover:bg-muted cursor-pointer flex items-center gap-2"
                onClick={() => handleSelect(emp)}
              >
                <Icon name="User" size={14} className="text-primary" />
                {emp}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostFileDispatchAndRecords;
