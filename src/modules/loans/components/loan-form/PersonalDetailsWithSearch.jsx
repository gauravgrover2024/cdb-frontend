import React from "react";
import PersonalDetails from "../../../customers/customer-form/PersonalDetails";

const PersonalDetailsWithSearch = ({ excludeFields = false, prefillMode = "all" }) => {
  return (
    <PersonalDetails 
      excludeFields={excludeFields} 
      searchable={true}
      prefillMode={prefillMode}
    />
  );
};

export default PersonalDetailsWithSearch;
