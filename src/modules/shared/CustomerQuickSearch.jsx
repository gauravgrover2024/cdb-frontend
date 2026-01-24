import React, { useState, useEffect } from "react";
import { Input, List, Card } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import demoCustomers from "../customers/demoCustomers";

const CustomerQuickSearch = ({ onSelect }) => {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!term) {
      setResults([]);
      return;
    }

    const filtered = demoCustomers.filter(
      (c) =>
        c.customerName?.toLowerCase().includes(term.toLowerCase()) ||
        c.primaryMobile?.includes(term)
    );

    setResults(filtered);
  }, [term]);

  return (
    <div style={{ position: "relative" }}>
      <Input
        placeholder="Search by name or mobile"
        prefix={<SearchOutlined />}
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />

      {results.length > 0 && (
        <Card
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 10,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          <List
            dataSource={results}
            renderItem={(item) => (
              <List.Item
                style={{ cursor: "pointer" }}
                onClick={() => {
                  onSelect(item);
                  setTerm("");
                  setResults([]);
                }}
              >
                {item.customerName} — {item.primaryMobile}
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
};

export default CustomerQuickSearch;
