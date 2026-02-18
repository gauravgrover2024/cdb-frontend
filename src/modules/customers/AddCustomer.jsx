import React, { useEffect, useRef, useState } from "react";
import { Form, message } from "antd";
import { useNavigate } from "react-router-dom";
import { customersApi } from "../../api/customers";
import dayjs from "dayjs";


import PersonalDetails from "./customer-form/PersonalDetails";
import EmploymentDetails from "./customer-form/EmploymentDetails";
import IncomeDetails from "./customer-form/IncomeDetails";
import KycDetails from "./customer-form/KycDetails";
import BankDetails from "./customer-form/BankDetails";
import ReferenceDetails from "./customer-form/ReferenceDetails";
// import CustomerStepperSidebar from "./CustomerStepperSidebar";
import CustomerStickyHeader from "./components/CustomerStickyHeader";

const sectionsConfig = [
  {
    key: "personal",
    label: "Personal",
    targetId: "section-personal",
    icon: "User",
  },
  {
    key: "employment",
    label: "Employment",
    targetId: "section-employment",
    icon: "Briefcase",
  },
  {
    key: "income",
    label: "Income",
    targetId: "section-income",
    icon: "Wallet",
  },
  {
    key: "bank",
    label: "Bank",
    targetId: "section-bank",
    icon: "Building2",
    },
  {
    key: "references",
    label: "References",
    targetId: "section-other",
    icon: "Users",
  },
  {
    key: "kyc",
    label: "KYC",
    targetId: "section-kyc",
    icon: "ShieldCheck",
  },
];

const formatDateForApi = (val) => {
  if (!val) return "";
  if (dayjs.isDayjs(val)) return val.format("YYYY-MM-DD");
  const d = dayjs(val);
  return d.isValid() ? d.format("YYYY-MM-DD") : "";
};

const AddCustomer = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("personal");

  const [headerInfo, setHeaderInfo] = useState({
    name: "",
    mobile: "",
    city: "",
    pan: "",
  });

  const [customerId, setCustomerId] = useState(null);
  const [displayId, setDisplayId] = useState(null);

  const creatingRef = useRef(false);
  const autoSaveTimerRef = useRef(null);

  // Header height (used to ensure form starts below sticky header)
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(180);
  const [saving, setSaving] = useState(false);

  const clearCustomerDraftCache = () => {
    try {
      localStorage.removeItem("customer_form_draft");
    } catch (e) {
      // ignore
    }
  };

  // -----------------------------
  // Measure header height (so form starts below it)
  // -----------------------------
  useEffect(() => {
    const measure = () => {
      if (!headerRef.current) return;
      const h = headerRef.current.getBoundingClientRect().height;
      if (h && h > 50) setHeaderHeight(h);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // -----------------------------
  // Scroll helper (scroll inside #app-scroll-container)
  // -----------------------------
  const scrollToSection = (targetId) => {
    const container = document.getElementById("app-scroll-container");
    const el = document.getElementById(targetId);

    if (!container || !el) return;

    const containerTop = container.getBoundingClientRect().top;
    const elTop = el.getBoundingClientRect().top;

    // dynamic offset = sticky header height + small gap
    const SCROLL_OFFSET = headerHeight + 16;

    const scrollTop =
      container.scrollTop + (elTop - containerTop) - SCROLL_OFFSET;

    container.scrollTo({
      top: scrollTop,
      behavior: "smooth",
    });
  };

  // -----------------------------
  // Scroll Spy (active pill highlight)
  // -----------------------------
  useEffect(() => {
    const container = document.getElementById("app-scroll-container");
    if (!container) return;

    const onScroll = () => {
      const OFFSET = headerHeight + 16;

      const offsets = sectionsConfig.map((s) => {
        const el = document.getElementById(s.targetId);
        if (!el) return { key: s.key, top: Infinity };

        const rect = el.getBoundingClientRect();
        return { key: s.key, top: rect.top };
      });

      const visible = offsets.reduce((prev, curr) =>
        Math.abs(curr.top - OFFSET) < Math.abs(prev.top - OFFSET) ? curr : prev,
      );

      if (visible.key && visible.key !== activeSection) {
        setActiveSection(visible.key);
      }
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // run once on load

    return () => container.removeEventListener("scroll", onScroll);
  }, [activeSection, headerHeight]);

  // -----------------------------
  // Cleanup autosave timer
  // -----------------------------
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // -----------------------------
  // Create customer ONLY when required
  // -----------------------------
  const createCustomerIfNeeded = async (initialData = {}, options = {}) => {
    const { silent = false } = options;
    if (customerId) return customerId;
    if (creatingRef.current) return null;

    // Validate minimal requirements for creation
    if (!initialData.customerName || !initialData.primaryMobile) {
       return null;
    }

    creatingRef.current = true;

    try {
      // ✅ Properly format the payload for initial creation too
      const payload = {
        ...initialData,
        dob: formatDateForApi(initialData?.dob),
        nomineeDob: formatDateForApi(initialData?.nomineeDob),
        // Convert array fields to strings for backend compatibility
        companyType: Array.isArray(initialData?.companyType) 
          ? initialData.companyType[0] || "" 
          : initialData?.companyType || "",
        businessNature: Array.isArray(initialData?.businessNature)
          ? initialData.businessNature[0] || ""
          : (initialData?.businessNature || ""),
        customerType: "New",
        kycStatus: initialData.kycStatus || "In Progress",
        createdOn: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      };

      const data = await customersApi.create(payload);

      const id = data?._id || data?.customer?._id || data?.data?._id;
      const hId = data?.data?.customerId || data?.customer?.customerId || data?.customerId;

      if (!id) throw new Error("Customer id missing from response");
      
      setCustomerId(id);
      if (hId) setDisplayId(hId);

      // 🚀 Redirect to edit page immediately so refresh doesn't lose data
      // BUT we return the ID first so the caller can finish if needed
      navigate(`/customers/edit/${id}`, { replace: true });

      return id;
    } catch (err) {
      console.error("Create Customer Error:", err);
      if (!silent && initialData.customerName && initialData.primaryMobile) {
        message.error(`Failed to create customer ❌ (${err.message})`);
      }
      return null;
    } finally {
      creatingRef.current = false;
    }
  };

  // -----------------------------
  // Save to mongo (PUT)
  // -----------------------------
  const saveToMongo = async (values, options = {}) => {
    const { silent = false } = options;
    // Force validation for mandatory fields before creating record
    if (!values.customerName || !values.primaryMobile) {
      if (silent) return null;
      throw new Error("Customer Name & Primary Mobile are required to create a profile.");
    }

    const id = await createCustomerIfNeeded(values, { silent });
    if (!id) return; // createCustomerIfNeeded already handles its own errors or navigation

    const payload = {
      ...values,

      // ✅ convert dayjs values safely
      dob: formatDateForApi(values?.dob),
      nomineeDob: formatDateForApi(values?.nomineeDob),

      // Convert array fields to strings for backend compatibility
      companyType: Array.isArray(values?.companyType) 
        ? values.companyType[0] || "" 
        : values?.companyType || "",
      businessNature: Array.isArray(values?.businessNature)
        ? values.businessNature[0] || ""
        : (values?.businessNature || ""),

      customerType: "New",
      kycStatus: values?.kycStatus || "In Progress",
      createdOn:
        values?.createdOn ||
        new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
    };

    await customersApi.update(id, payload);

    return true;
  };

  // -----------------------------
  // Check meaningful input
  // -----------------------------
  const hasMeaningfulData = (values) => {
    return (
      (values?.customerName && values.customerName.trim()) &&
      (values?.primaryMobile && values.primaryMobile.trim())
    );
  };

  // -----------------------------
  // Header live update + autosave debounce
  // -----------------------------
  const handleValuesChange = (_, allValues) => {
    setHeaderInfo({
      name: allValues.customerName || "",
      mobile: allValues.primaryMobile || "",
      city: allValues.city || "",
      pan: allValues.panNumber || "",
    });

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    // Debounced autosave to backend for persistence
    autoSaveTimerRef.current = setTimeout(() => {
      if (!hasMeaningfulData(allValues)) return;
      saveToMongo(allValues, { silent: true }).catch(() => {
        // Silent autosave failure: no UI spam
      });
    }, 1200);
  };

  // -----------------------------
  // Save buttons
  // -----------------------------
  const handleSaveOnly = async () => {
    try {
      setSaving(true);
      const values = form.getFieldsValue(true);

      if (!hasMeaningfulData(values)) {
        message.warning("Please enter Name / Mobile / PAN before saving");
        setSaving(false);
        return;
      }

      await saveToMongo(values);
      clearCustomerDraftCache();
      message.success("Saved ✅");
    } catch (err) {
      console.error("Save Error:", err);
      message.error(`Save failed ❌ (${err.message})`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndExit = async () => {
    try {
      setSaving(true);
      const values = form.getFieldsValue(true);

      if (!hasMeaningfulData(values)) {
        message.warning("Please enter Name / Mobile / PAN before saving");
        setSaving(false);
        return;
      }

      await saveToMongo(values);
      clearCustomerDraftCache();
      message.success("Customer saved ✅");
      navigate("/customers");
    } catch (err) {
      console.error("Save & Exit Error:", err);
      message.error(`Save failed ❌ (${err.message})`);
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="min-h-screen bg-background pb-10">
      <CustomerStickyHeader
        headerInfo={headerInfo}
        mode="Add"
        displayId={displayId}
        customerId={customerId}
        onSave={handleSaveOnly}
        onSaveAndExit={handleSaveAndExit}
        activeSection={activeSection}
        sectionsConfig={sectionsConfig}
        onSectionClick={(targetId) => scrollToSection(targetId)}
        innerRef={headerRef}
        saving={saving}
      />

      <div className="w-full px-4 md:px-8 py-6">
        {/* Form Content */}
        <div className="w-full">
          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleValuesChange}
            initialValues={{
              kycStatus: "In Progress",
              customerType: "New",
              extraMobiles: [],
              businessNature: "",
              companyType: "",
            }}
          >
            <div id="section-personal" className="mb-12 scroll-mt-[180px]">
              <PersonalDetails />
            </div>

            <div id="section-employment" className="mb-12 scroll-mt-[180px]">
              <EmploymentDetails />
            </div>

            <div id="section-income" className="mb-12 scroll-mt-[180px]">
              <IncomeDetails />
            </div>

            <div id="section-bank" className="mb-12 scroll-mt-[180px]">
              <BankDetails />
            </div>

            <div id="section-other" className="mb-12 scroll-mt-[180px]">
              <ReferenceDetails />
            </div>

            <div id="section-kyc" className="mb-12 scroll-mt-[180px]">
              <KycDetails />
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default AddCustomer;
