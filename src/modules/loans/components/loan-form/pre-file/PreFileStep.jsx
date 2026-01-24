import React from "react";
import { Form, Empty } from "antd";
import PreFilePersonalDetails from "./PreFilePersonalDetails.jsx";

const PreFileStep = () => {
  const isFinanced = Form.useWatch("isFinanced");

  // Pre-File visible ONLY for financed cars
  if (isFinanced !== "Yes") {
    return (
      <Empty
        description="Pre-File is applicable only for financed vehicles"
        style={{ padding: 40 }}
      />
    );
  }

  return (
    <>
      {/* ===============================
          PRE-FILE : SECTION 1
         =============================== */}

      <PreFilePersonalDetails />
    </>
  );
};

export default PreFileStep;
