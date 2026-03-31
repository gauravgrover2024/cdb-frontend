// src/modules/print/PrintButton.jsx
// Reusable print trigger — wraps any print-area content
import React, { useRef } from "react";
import { Button } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import "./print.css";

const PrintButton = ({ children, label = "Print", size = "middle", className = "" }) => {
  const ref = useRef(null);

  const handlePrint = () => {
    const content = ref.current;
    if (!content) return;
    const original = document.body.innerHTML;
    document.body.innerHTML = `<div class="print-area">${content.innerHTML}</div>`;
    window.print();
    document.body.innerHTML = original;
    window.location.reload();
  };

  return (
    <div>
      <div className="no-print mb-3">
        <Button icon={<PrinterOutlined />} onClick={handlePrint} size={size} className={className}>
          {label}
        </Button>
      </div>
      <div ref={ref} className="print-area">
        {children}
      </div>
    </div>
  );
};

export default PrintButton;
