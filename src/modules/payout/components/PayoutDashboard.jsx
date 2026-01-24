// src/modules/payouts/components/PayoutDashboard.jsx

import React from "react";
import { Card, Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const PayoutDashboard = () => {
  const navigate = useNavigate();

  return (
    <div>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate("/loans/dashboard")}
        style={{ marginBottom: 20 }}
      >
        Back
      </Button>
      <Card>
        <h2>Payout Management</h2>
        <p>Coming Soon...</p>
      </Card>
    </div>
  );
};

export default PayoutDashboard;
