import React, { useState, useEffect } from "react";
import { Form, message } from "antd";
import Icon from "../../../../../components/AppIcon";
import { getEmployees } from "../../../../../api/employees";
import { banksApi } from "../../../../../api/banks";

const PostFileDispatchAndRecords = ({ form }) => {
  const loanId = Form.useWatch("loanId", form);
  const [employees, setEmployees] = useState([]);
  const [banks, setBanks] = useState([]);

  // Initialize data and defaults
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empData, bankRes] = await Promise.all([
          getEmployees(),
          banksApi.getAll()
        ]);
        
        // Employees usually come as array of objects
        setEmployees(empData.map(e => e.name || e.username || e.email)); // Adjust based on API response structure
        
        // Banks response might be { data: [...] } or just [...]
        const bankList = bankRes.data || bankRes || [];
        setBanks(bankList);
      } catch (err) {
        console.error("Error fetching master data:", err);
      }
    };

    fetchData();

    // Default dates logic
    const alreadyInitialized = form.getFieldValue("__dispatchInitialized");
    if (!alreadyInitialized) {
      const now = new Date();
      form.setFieldsValue({
        disbursement_date: now.toISOString().split("T")[0],
        disbursement_time: now.toTimeString().slice(0, 5),
        __dispatchInitialized: true,
      });
    }
  }, [form]);

  // Handle adding a new bank to database
  const handleCreateBank = async (bankData) => {
    try {
      const res = await banksApi.create(bankData);
      const newBank = res.data;
      setBanks(prev => [...prev, newBank].sort((a, b) => a.name.localeCompare(b.name)));
      message.success("Bank saved for future use!");
      return newBank;
    } catch (error) {
       console.error(error);
       message.error("Failed to save bank details.");
       return null;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Dispatch Details Section */}
      <div className="bg-card rounded-lg border border-border p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="Send" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground">
              Dispatch & Disbursement
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              Document dispatch and payout information
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Dispatch Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Form.Item label="Dispatch Date" name="dispatch_date" className="mb-0">
               <input type="date" className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background" />
            </Form.Item>
            <Form.Item label="Dispatch Time" name="dispatch_time" className="mb-0">
               <input type="time" className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background" />
            </Form.Item>
            <Form.Item label="Dispatch Through" name="dispatch_through" className="mb-0">
              <input type="text" className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background" placeholder="e.g., Courier" />
            </Form.Item>
          </div>

          <div className="h-[1px] bg-border/50 my-2" />

          {/* Disbursement Info & Bank Details */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Icon name="CreditCard" size={16} className="text-primary" />
              Disbursement Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               <Form.Item label="Disbursement Date" name="disbursement_date" className="mb-0">
                 <input type="date" className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background" />
               </Form.Item>
               <Form.Item label="Disbursement Time" name="disbursement_time" className="mb-0">
                 <input type="time" className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background" />
               </Form.Item>
               
                <Form.Item label="Loan Number" name="loanId" className="mb-0">
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground font-medium"
                      placeholder="Enter Loan ID..."
                      value={loanId || ""}
                      onChange={(e) => form.setFieldsValue({ loanId: e.target.value })}
                    />
                    <div className={`absolute right-2 top-1/2 -translate-y-1/2 ${loanId ? "text-primary" : "text-muted-foreground"}`}>
                      <Icon name={loanId ? "CheckCircle" : "AlertCircle"} size={14} />
                    </div>
                  </div>
                </Form.Item>

                {/* Bank Name Autosuggest */}
                <div className="md:col-span-1">
                   <BankAutosuggest 
                      banks={banks} 
                      form={form} 
                      onCreate={handleCreateBank}
                   />
                </div>

                <Form.Item label="Account Number" name="accountNumber" className="mb-0 md:col-span-1">
                  <input type="text" className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background font-medium" placeholder="Account No" />
                </Form.Item>

                <Form.Item label="IFSC Code" name="ifscCode" className="mb-0 md:col-span-1">
                  <input type="text" className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background" placeholder="SBIN0001234" maxLength={11} style={{textTransform: 'uppercase'}} />
                </Form.Item>

                <Form.Item label="Branch / Address" name="branch" className="mb-0 md:col-span-1">
                  <input type="text" className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background" placeholder="Branch Name" />
                </Form.Item>
            </div>
          </div>

          <div className="p-3 bg-primary/5 rounded-md border border-primary/20">
            <p className="text-xs text-foreground flex items-center gap-2">
              <Icon name="Info" size={14} className="text-primary" />
              <span>Loan number is assigned automatically. Bank details are saved for future use.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Record Details Section */}
      <div className="bg-card rounded-lg border border-border p-4 md:p-6">
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
            employees={employees}
          />
        </div>
      </div>
    </div>
  );
};

const EmployeeAutosuggest = ({ label, name, form, employees }) => {
  const [inputValue, setInputValue] = useState(form.getFieldValue(name) || "");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = (employees || []).filter((emp) =>
    emp && emp.toLowerCase().includes((inputValue || "").toLowerCase())
  );

  const handleSelect = (val) => {
    setInputValue(val);
    form.setFieldsValue({ [name]: val });
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <div className="relative">
        <input
          type="text"
          className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background pr-8"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            form.setFieldsValue({ [name]: e.target.value });
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Select Employee..."
        />
        <Icon name="User" size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        
        {showSuggestions && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto z-10">
            {filtered.map((emp, i) => (
              <div key={i} className="px-3 py-2 text-sm hover:bg-muted cursor-pointer" onClick={() => handleSelect(emp)}>
                {emp}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Bank Autosuggest with "Create New" support
const BankAutosuggest = ({ banks, form, onCreate }) => {
  const [inputValue, setInputValue] = useState(form.getFieldValue("bankName") || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const filtered = (banks || []).filter(b => b.name.toLowerCase().includes((inputValue || "").toLowerCase()));
  const exactMatch = filtered.find(b => b.name.toLowerCase() === (inputValue || "").toLowerCase());

  const handleSelect = (bank) => {
    setInputValue(bank.name);
    form.setFieldsValue({
      bankName: bank.name,
      ifscCode: bank.ifsc,
      branch: bank.address
    });
    setShowSuggestions(false);
  };

  const createNewBank = async () => {
     // Simple prompt or modal could go here, but for now we take the Name and current IFSC form value
     const currentIFSC = form.getFieldValue("ifscCode");
     const currentAddr = form.getFieldValue("branch");
     
     if (!currentIFSC) {
       message.error("Please enter IFSC code to save this bank.");
       return;
     }

     await onCreate({
       name: inputValue,
       ifsc: currentIFSC,
       address: currentAddr || ""
     });
     setShowSuggestions(false);
  };

  return (
    <div className="relative">
       <label className="text-xs text-muted-foreground mb-1 block">Bank Name</label>
       <div className="relative">
         <input
           type="text"
           className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background pr-8"
           placeholder="Search or Type Bank..."
           value={inputValue}
           onChange={(e) => {
             setInputValue(e.target.value);
             form.setFieldsValue({ bankName: e.target.value });
             setShowSuggestions(true);
           }}
           onFocus={() => setShowSuggestions(true)}
           onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
         />
         <Icon name="Building2" size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
         
         {showSuggestions && inputValue && (
           <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
             {filtered.map((b) => (
               <div key={b._id} className="px-3 py-2 text-sm hover:bg-muted cursor-pointer" onClick={() => handleSelect(b)}>
                 <div className="font-medium">{b.name}</div>
                 <div className="text-xs text-muted-foreground">{b.ifsc}</div>
               </div>
             ))}
             {!exactMatch && inputValue.length > 2 && (
               <div className="px-3 py-2 text-sm bg-primary/5 hover:bg-primary/10 cursor-pointer text-primary border-t border-border" onClick={createNewBank}>
                 + Save "{inputValue}" for future
               </div>
             )}
           </div>
         )}
       </div>
    </div>
  );
};

export default PostFileDispatchAndRecords;
