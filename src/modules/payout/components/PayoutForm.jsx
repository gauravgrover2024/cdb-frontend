// src/modules/payouts/components/PayoutForm.jsx

import React from "react";
import { Card, Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const PayoutForm = () => {
  const navigate = useNavigate();

  return (
    <div>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate("/payouts/dashboard")}
        style={{ marginBottom: 20 }}
      >
        Back
      </Button>
      <Card>
        <h2>Payout Form</h2>
        <p>Coming Soon...</p>
      </Card>
    </div>
  );
};

export default PayoutForm;
