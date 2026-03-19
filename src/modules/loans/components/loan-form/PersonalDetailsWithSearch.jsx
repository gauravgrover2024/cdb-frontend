import React from "react";
import PersonalDetails from "../../../customers/customer-form/PersonalDetails";

const PersonalDetailsWithSearch = ({
  excludeFields = false,
  prefillMode = "all",
  cashMinimalMode = false,
}) => {
  return (
    <PersonalDetails 
      excludeFields={excludeFields} 
      searchable={true}
      prefillMode={prefillMode}
      showApplicantType={false}
      cashMinimalMode={cashMinimalMode}
      loanProfileMode={true}
    />
  );
};

export default PersonalDetailsWithSearch;
