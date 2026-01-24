export const useCustomerAutofill = (form, basePath) => {
  const hydrateFromCustomer = (customer) => {
    if (!customer) return;

    const map = {
      name: customer.name,
      motherName: customer.motherName,
      fatherName: customer.fatherName,
      dob: customer.dob,
      gender: customer.gender,
      maritalStatus: customer.maritalStatus,
      dependents: customer.dependents,
      education: customer.education,
      address: customer.address,
      city: customer.city,
      pincode: customer.pincode,
      mobiles: customer.mobiles,
      houseType: customer.houseType,
      pan: customer.pan,
      aadhaar: customer.aadhaar,
      occupation: customer.occupation,
      designation: customer.designation,
      experience: customer.experience,
      companyName: customer.companyName,
      companyAddress: customer.companyAddress,
      officeCity: customer.officeCity,
      officePincode: customer.officePincode,
      officePhone: customer.officePhone,
    };

    const payload = {};
    Object.entries(map).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        payload[`${basePath}.${key}`] = value;
      }
    });

    form.setFieldsValue(payload);
  };

  return { hydrateFromCustomer };
};
