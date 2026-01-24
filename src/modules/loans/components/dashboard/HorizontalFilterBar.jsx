import React, { useState } from "react";
import Icon from "../../../../components/AppIcon";
import Button from "../../../../components/ui/Button";



const HorizontalFilterBar = ({ filters, onFilterChange, onResetFilters }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const loanTypes = [
    { value: "New Car", label: "New Car" },
    { value: "Used Car", label: "Used Car" },
    { value: "Refinance", label: "Refinance" },
    { value: "Car Cash-in", label: "Car Cash-in" },
  ];

  const stages = [
    { value: "profile", label: "Customer Profile" },
    { value: "prefile", label: "Pre-File" },
    { value: "approval", label: "Loan Approval" },
    { value: "postfile", label: "Post-File" },
    { value: "delivery", label: "Vehicle Delivery" },
  ];

  const statuses = [
    { value: "pending", label: "Pending", color: "bg-warning" },
    { value: "in-progress", label: "In Progress", color: "bg-primary" },
    { value: "approved", label: "Approved", color: "bg-success" },
    { value: "disbursed", label: "Disbursed", color: "bg-success" },
    { value: "rejected", label: "Rejected", color: "bg-error" },
    { value: "on-hold", label: "On Hold", color: "bg-muted" },
  ];

  const agingBuckets = [
    { value: "0-7", label: "0-7 Days" },
    { value: "8-15", label: "8-15 Days" },
    { value: "16-30", label: "16-30 Days" },
    { value: "31-60", label: "31-60 Days" },
    { value: "60+", label: "60+ Days" },
  ];

  const amountRanges = [
    { value: "0-5", label: "₹0-5L" },
    { value: "5-10", label: "₹5-10L" },
    { value: "10-15", label: "₹10-15L" },
    { value: "15-20", label: "₹15-20L" },
    { value: "20+", label: "₹20L+" },
  ];

  const activeFilterCount =
    (filters?.loanTypes?.length || 0) +
    (filters?.stages?.length || 0) +
    (filters?.statuses?.length || 0) +
    (filters?.agingBuckets?.length || 0) +
    (filters?.amountRanges?.length || 0);

  const removeFilter = (category, value) => {
    const newValues = filters[category].filter((v) => v !== value);
    onFilterChange(category, newValues);
  };

  return (
    
    <div className="bg-card border border-border rounded-lg mb-4">
      {/* Filter Header */}
      <div className="p-3 md:p-4 flex items-center justify-between border-b border-border">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          <Icon name="Filter" size={16} />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-primary text-white rounded-full text-xs">
              {activeFilterCount}
            </span>
          )}
          <Icon
            name={isExpanded ? "ChevronUp" : "ChevronDown"}
            size={16}
            className="text-muted-foreground"
          />
        </button>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              iconName="X"
              onClick={onResetFilters}
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && !isExpanded && (
        <div className="p-3 flex flex-wrap gap-2">
          {filters?.loanTypes?.map((type) => (
            <span
              key={type}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs border border-primary/20"
            >
              {loanTypes.find((t) => t.value === type)?.label}
              <button
                onClick={() => removeFilter("loanTypes", type)}
                className="hover:text-error"
              >
                <Icon name="X" size={12} />
              </button>
            </span>
          ))}
          {filters?.stages?.map((stage) => (
            <span
              key={stage}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs border border-primary/20"
            >
              {stages.find((s) => s.value === stage)?.label}
              <button
                onClick={() => removeFilter("stages", stage)}
                className="hover:text-error"
              >
                <Icon name="X" size={12} />
              </button>
            </span>
          ))}
          {filters?.statuses?.map((status) => (
            <span
              key={status}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs border border-primary/20"
            >
              {statuses.find((s) => s.value === status)?.label}
              <button
                onClick={() => removeFilter("statuses", status)}
                className="hover:text-error"
              >
                <Icon name="X" size={12} />
              </button>
            </span>
          ))}
          {filters?.agingBuckets?.map((bucket) => (
            <span
              key={bucket}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs border border-primary/20"
            >
              {agingBuckets.find((b) => b.value === bucket)?.label}
              <button
                onClick={() => removeFilter("agingBuckets", bucket)}
                className="hover:text-error"
              >
                <Icon name="X" size={12} />
              </button>
            </span>
          ))}
          {filters?.amountRanges?.map((range) => (
            <span
              key={range}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs border border-primary/20"
            >
              {amountRanges.find((r) => r.value === range)?.label}
              <button
                onClick={() => removeFilter("amountRanges", range)}
                className="hover:text-error"
              >
                <Icon name="X" size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Row 1: Loan Type & Stage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Loan Type
              </label>
              <div className="flex flex-wrap gap-2">
                {loanTypes.map((type) => {
                  const isSelected = filters?.loanTypes?.includes(type.value);
                  return (
                    <button
                      key={type.value}
                      onClick={() => {
                        const newTypes = isSelected
                          ? filters.loanTypes.filter((t) => t !== type.value)
                          : [...(filters.loanTypes || []), type.value];
                        onFilterChange("loanTypes", newTypes);
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                        isSelected
                          ? "bg-primary text-white border-primary"
                          : "bg-background text-foreground border-border hover:border-primary"
                      }`}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Current Stage
              </label>
              <div className="flex flex-wrap gap-2">
                {stages.map((stage) => {
                  const isSelected = filters?.stages?.includes(stage.value);
                  return (
                    <button
                      key={stage.value}
                      onClick={() => {
                        const newStages = isSelected
                          ? filters.stages.filter((s) => s !== stage.value)
                          : [...(filters.stages || []), stage.value];
                        onFilterChange("stages", newStages);
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                        isSelected
                          ? "bg-primary text-white border-primary"
                          : "bg-background text-foreground border-border hover:border-primary"
                      }`}
                    >
                      {stage.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 2: Status & Aging */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {statuses.map((status) => {
                  const isSelected = filters?.statuses?.includes(status.value);
                  return (
                    <button
                      key={status.value}
                      onClick={() => {
                        const newStatuses = isSelected
                          ? filters.statuses.filter((s) => s !== status.value)
                          : [...(filters.statuses || []), status.value];
                        onFilterChange("statuses", newStatuses);
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs border transition-colors flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-primary text-white border-primary"
                          : "bg-background text-foreground border-border hover:border-primary"
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${status.color}`} />
                      {status.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Aging
              </label>
              <div className="flex flex-wrap gap-2">
                {agingBuckets.map((bucket) => {
                  const isSelected = filters?.agingBuckets?.includes(
                    bucket.value
                  );
                  return (
                    <button
                      key={bucket.value}
                      onClick={() => {
                        const newBuckets = isSelected
                          ? filters.agingBuckets.filter(
                              (b) => b !== bucket.value
                            )
                          : [...(filters.agingBuckets || []), bucket.value];
                        onFilterChange("agingBuckets", newBuckets);
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                        isSelected
                          ? "bg-primary text-white border-primary"
                          : "bg-background text-foreground border-border hover:border-primary"
                      }`}
                    >
                      {bucket.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 3: Amount Range */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Loan Amount Range
            </label>
            <div className="flex flex-wrap gap-2">
              {amountRanges.map((range) => {
                const isSelected = filters?.amountRanges?.includes(range.value);
                return (
                  <button
                    key={range.value}
                    onClick={() => {
                      const newRanges = isSelected
                        ? filters.amountRanges.filter((r) => r !== range.value)
                        : [...(filters.amountRanges || []), range.value];
                      onFilterChange("amountRanges", newRanges);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                      isSelected
                        ? "bg-primary text-white border-primary"
                        : "bg-background text-foreground border-border hover:border-primary"
                    }`}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



export default HorizontalFilterBar;
