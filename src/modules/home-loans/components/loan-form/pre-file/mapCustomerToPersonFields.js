import dayjs from "dayjs";

export const mapCustomerToPersonFields = (customer, prefix) => {
  if (!customer) return {};

  return {
    // Personal
    [`${prefix}_customerName`]: customer.customerName || "",
    [`${prefix}_motherName`]: customer.motherName || "",
    [`${prefix}_fatherName`]: customer.sdwOf || "",
    [`${prefix}_gender`]: customer.gender || "",
    [`${prefix}_maritalStatus`]: customer.maritalStatus || "",
    [`${prefix}_dependents`]: customer.dependents || "",
    [`${prefix}_education`]: customer.education || "",
    [`${prefix}_houseType`]: customer.houseType || "",

    [`${prefix}_address`]: customer.residenceAddress || "",
    [`${prefix}_pincode`]: customer.pincode || "",
    [`${prefix}_city`]: customer.city || "",
    [`${prefix}_yearsAtResidence`]: customer.yearsInCurrentHouse || "",

    [`${prefix}_primaryMobile`]: customer.primaryMobile || "",
    [`${prefix}_extraMobiles`]: customer.extraMobiles || [],

    [`${prefix}_pan`]: customer.panNumber || "",
    [`${prefix}_aadhaar`]: customer.aadhaarNumber || "",

    // DOB — CRITICAL FIX
    [`${prefix}_dob`]: customer.dob ? dayjs(customer.dob) : null,

    // Occupational
    [`${prefix}_occupation`]: customer.occupationType || "",
    [`${prefix}_professionalType`]: customer.professionalType || "",
    // companyType is single select, businessNature is multi-select
    [`${prefix}_companyType`]: Array.isArray(customer.companyType) 
      ? customer.companyType[0] || ""
      : (customer.companyType || ""),
    [`${prefix}_businessNature`]: typeof customer.businessNature === 'string'
      ? customer.businessNature.split(',').map(s => s.trim()).filter(Boolean)
      : (Array.isArray(customer.businessNature) ? customer.businessNature : []),

    [`${prefix}_employerDetail`]: customer.employerDetail || "",
    [`${prefix}_designation`]: customer.designation || "",
    [`${prefix}_currentExperience`]: customer.experienceCurrent || "",
    [`${prefix}_totalExperience`]: customer.totalExperience || "",

    [`${prefix}_companyName`]: customer.companyName || "",
    [`${prefix}_companyAddress`]: customer.employmentAddress || "",
    [`${prefix}_companyPincode`]: customer.employmentPincode || "",
    [`${prefix}_companyCity`]: customer.employmentCity || "",
    [`${prefix}_companyPhone`]: customer.employmentPhone || "",
    
    // Customer ID
    [`${prefix}_id`]: customer._id || customer.id || "",
    customerId: prefix === "" ? (customer._id || customer.id || "") : undefined, // Top level for main applicant
  };
};
