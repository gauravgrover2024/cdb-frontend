import React, { useState, useEffect, useRef } from "react";
import { Input, List, Card, Spin, Empty } from "antd";
import { 
  SearchOutlined, 
  UserOutlined, 
  PhoneOutlined, 
  IdcardOutlined 
} from "@ant-design/icons";
import { customersApi } from "../../api/customers";

const CustomerQuickSearch = ({ onSelect, value, onChange, placeholder, className }) => {
  const [term, setTerm] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const needsSearch = useRef(false);

  // Sync internal term with external value (when auto-filled or prop changed)
  useEffect(() => {
    if (value !== term) {
      setTerm(value || "");
      needsSearch.current = false;
    }
  }, [value, term]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      // Only search if term is non-empty AND this was triggered by user input
      if (!term.trim() || !needsSearch.current) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await customersApi.search(term);
        const data = response.data || response || [];
        setResults(Array.isArray(data) ? data : []);
        setIsDropdownVisible(true);
      } catch (error) {
        console.error("Error searching customers:", error);
        setResults([]);
      } finally {
        setLoading(false);
        needsSearch.current = false;
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [term]);

  const handleInputChange = (e) => {
    const newVal = e.target.value;
    setTerm(newVal);
    needsSearch.current = true;
    if (onChange) {
      onChange(newVal);
    }
    if (!newVal.trim()) {
      setIsDropdownVisible(false);
      setResults([]);
    }
  };

  const handleItemSelect = (item) => {
    setTerm(item.customerName);
    setIsDropdownVisible(false);
    setResults([]);
    needsSearch.current = false;
    if (onSelect) {
      onSelect(item);
    }
    if (onChange) {
      onChange(item.customerName);
    }
  };

  return (
    <div className="relative w-full">
      <Input
        placeholder={placeholder || "Search existing customer..."}
        prefix={<SearchOutlined className="text-muted-foreground mr-1" />}
        value={term}
        onChange={handleInputChange}
        onFocus={() => {
          if (term && results.length > 0) {
            setIsDropdownVisible(true);
          }
        }}
        allowClear
        className={className}
      />

      {isDropdownVisible && (loading || results.length > 0 || (term && !loading && needsSearch.current)) && (
        <Card
          className="absolute top-full left-0 right-0 z-[1001] mt-2 shadow-2xl border-border/50 overflow-hidden backdrop-blur-xl bg-card/95"
          styles={{ body: { padding: 0 } }}
        >
          {loading ? (
            <div className="p-8 text-center flex flex-col items-center gap-3">
              <Spin size="small" />
              <span className="text-xs text-muted-foreground animate-pulse font-medium uppercase tracking-widest">Searching Records...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
              <div className="px-3 py-2 bg-muted/30 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Matching Customers
              </div>
              <List
                dataSource={results}
                renderItem={(item) => (
                  <div
                    className="group cursor-pointer p-3 border-b border-border/40 last:border-0 hover:bg-primary/5 transition-all duration-200"
                    onClick={() => handleItemSelect(item)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <UserOutlined className="text-primary text-sm" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {item.customerName}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <PhoneOutlined className="text-[10px]" />
                            {item.primaryMobile}
                          </span>
                          {item.panNumber && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground border-l border-border pl-3">
                              <IdcardOutlined className="text-[10px]" />
                              {item.panNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          ) : term && needsSearch.current && (
            <div className="p-8">
              <Empty 
                description={<span className="text-xs text-muted-foreground font-medium">No records found for "{term}"</span>} 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
              />
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default CustomerQuickSearch;
