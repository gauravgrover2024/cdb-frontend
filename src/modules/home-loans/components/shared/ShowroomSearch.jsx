import React, { useState, useEffect, useCallback } from "react";
import { Form, Spin } from "antd";
import { showroomsApi } from "../../../../../api/showrooms";
import Icon from "../../../../../components/AppIcon";

/**
 * Showroom Search with Auto-complete
 * Similar to customer search functionality
 */
const ShowroomSearch = ({ form, fieldPrefix = "" }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedShowroom, setSelectedShowroom] = useState(null);

  // Debounced search
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await showroomsApi.search(searchTerm);
        setSearchResults(response.data || []);
        setShowDropdown(true);
      } catch (error) {
        console.error("Failed to search showrooms:", error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleShowroomSelect = useCallback(
    (showroom) => {
      setSelectedShowroom(showroom);
      setSearchTerm(showroom.name);
      setShowDropdown(false);

      // Populate form fields
      form.setFieldsValue({
        [`${fieldPrefix}showroomId`]: showroom.showroomId,
        [`${fieldPrefix}showroomName`]: showroom.name,
        [`${fieldPrefix}showroomMobile`]: showroom.mobile,
        [`${fieldPrefix}showroomContactPerson`]: showroom.contactPerson,
        [`${fieldPrefix}showroomCity`]: showroom.city,
        [`${fieldPrefix}showroomAddress`]: showroom.address,
        [`${fieldPrefix}showroomCommissionRate`]: showroom.commissionRate,
        [`${fieldPrefix}outstandingCommission`]: showroom.outstandingCommission,
      });
    },
    [form, fieldPrefix]
  );

  const handleClear = () => {
    setSearchTerm("");
    setSelectedShowroom(null);
    setSearchResults([]);
    form.setFieldsValue({
      [`${fieldPrefix}showroomId`]: undefined,
      [`${fieldPrefix}showroomName`]: undefined,
      [`${fieldPrefix}showroomMobile`]: undefined,
      [`${fieldPrefix}showroomContactPerson`]: undefined,
      [`${fieldPrefix}showroomCity`]: undefined,
      [`${fieldPrefix}showroomAddress`]: undefined,
      [`${fieldPrefix}showroomCommissionRate`]: undefined,
      [`${fieldPrefix}outstandingCommission`]: undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <label htmlFor="showroom-search-input" className="text-xs text-muted-foreground mb-1 block">
          Search Showroom
        </label>
        <div className="relative">
          <input
            id="showroom-search-input"
            name="showroom-search"
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Search by name, mobile, or ID..."
            autoComplete="off"
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background pr-20"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {loading && <Spin size="small" />}
            {selectedShowroom && (
              <button
                type="button"
                onClick={handleClear}
                className="text-muted-foreground hover:text-foreground"
              >
                <Icon name="X" size={14} />
              </button>
            )}
            <Icon name="Search" size={14} className="text-muted-foreground" />
          </div>
        </div>

        {/* Dropdown Results */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
            {searchResults.map((showroom) => (
              <button
                key={showroom._id}
                type="button"
                onClick={() => handleShowroomSelect(showroom)}
                className="w-full px-3 py-2 text-left hover:bg-muted transition-colors border-b border-border last:border-0"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {showroom.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {showroom.showroomId} • {showroom.mobile}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {showroom.city}
                    </p>
                  </div>
                  {showroom.outstandingCommission > 0 && (
                    <div className="ml-2 px-2 py-0.5 bg-warning/10 rounded text-xs text-warning font-medium">
                      ₹{showroom.outstandingCommission.toLocaleString()} due
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {showDropdown && searchTerm.length >= 2 && searchResults.length === 0 && !loading && (
          <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg p-3">
            <p className="text-sm text-muted-foreground text-center">
              No showrooms found
            </p>
          </div>
        )}
      </div>

      {/* Selected Showroom Display */}
      {selectedShowroom && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
              <Icon name="CheckCircle" size={20} className="text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {selectedShowroom.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedShowroom.contactPerson} • {selectedShowroom.mobile}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedShowroom.city} • Commission: {selectedShowroom.commissionRate}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Form Fields */}
      <div className="hidden">
        <Form.Item name={`${fieldPrefix}showroomId`}>
          <input id={`${fieldPrefix}showroomId`} name={`${fieldPrefix}showroomId`} type="hidden" />
        </Form.Item>
        <Form.Item name={`${fieldPrefix}showroomName`}>
          <input id={`${fieldPrefix}showroomName`} name={`${fieldPrefix}showroomName`} type="hidden" />
        </Form.Item>
        <Form.Item name={`${fieldPrefix}showroomMobile`}>
          <input id={`${fieldPrefix}showroomMobile`} name={`${fieldPrefix}showroomMobile`} type="hidden" />
        </Form.Item>
        <Form.Item name={`${fieldPrefix}showroomContactPerson`}>
          <input id={`${fieldPrefix}showroomContactPerson`} name={`${fieldPrefix}showroomContactPerson`} type="hidden" />
        </Form.Item>
        <Form.Item name={`${fieldPrefix}showroomCity`}>
          <input id={`${fieldPrefix}showroomCity`} name={`${fieldPrefix}showroomCity`} type="hidden" />
        </Form.Item>
        <Form.Item name={`${fieldPrefix}showroomAddress`}>
          <input id={`${fieldPrefix}showroomAddress`} name={`${fieldPrefix}showroomAddress`} type="hidden" />
        </Form.Item>
        <Form.Item name={`${fieldPrefix}showroomCommissionRate`}>
          <input id={`${fieldPrefix}showroomCommissionRate`} name={`${fieldPrefix}showroomCommissionRate`} type="hidden" />
        </Form.Item>
        <Form.Item name={`${fieldPrefix}outstandingCommission`}>
          <input id={`${fieldPrefix}outstandingCommission`} name={`${fieldPrefix}outstandingCommission`} type="hidden" />
        </Form.Item>
      </div>
    </div>
  );
};

export default ShowroomSearch;
