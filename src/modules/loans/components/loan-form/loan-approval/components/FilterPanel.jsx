import React from "react";
import Icon from "../../../../../../components/AppIcon";
import Select from "../../../../../../components/ui/Select";
import Input from "../../../../../../components/ui/Input";
import Button from "../../../../../../components/ui/Button";

const FilterPanel = ({ filters, onFilterChange, onReset }) => {
  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "Pending", label: "Pending" },
    { value: "Under Review", label: "Under Review" },
    { value: "Documents Required", label: "Documents Required" },
    { value: "Approved", label: "Approved" },
    { value: "Rejected", label: "Rejected" },
  ];

  const priorityOptions = [
    { value: "", label: "All Priorities" },
    { value: "High", label: "High Priority" },
    { value: "Medium", label: "Medium Priority" },
    { value: "Low", label: "Low Priority" },
  ];

  const bankOptions = [
    { value: "", label: "All Banks" },
    { value: "HDFC Bank", label: "HDFC Bank" },
    { value: "ICICI Bank", label: "ICICI Bank" },
    { value: "Axis Bank", label: "Axis Bank" },
    { value: "Kotak Mahindra Bank", label: "Kotak Mahindra Bank" },
    { value: "State Bank of India", label: "State Bank of India" },
  ];

  return (
    <div className="bg-card rounded-lg border border-border p-4 md:p-6">
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon name="Filter" size={20} className="text-primary" />
        </div>
        <div>
          <h3 className="text-base md:text-lg font-semibold text-foreground">
            Filter Applications
          </h3>
          <p className="text-xs md:text-sm text-muted-foreground">
            Refine your search criteria
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Select
          label="Status"
          options={statusOptions}
          value={filters?.status}
          onChange={(value) => onFilterChange("status", value)}
        />

        <Select
          label="Priority"
          options={priorityOptions}
          value={filters?.priority}
          onChange={(value) => onFilterChange("priority", value)}
        />

        <Select
          label="Bank"
          options={bankOptions}
          value={filters?.bank}
          onChange={(value) => onFilterChange("bank", value)}
        />

        <Input
          label="From Date"
          type="date"
          value={filters?.fromDate}
          onChange={(e) => onFilterChange("fromDate", e?.target?.value)}
        />

        <Input
          label="To Date"
          type="date"
          value={filters?.toDate}
          onChange={(e) => onFilterChange("toDate", e?.target?.value)}
        />

        <Input
          label="Search"
          type="text"
          placeholder="Application ID, Customer..."
          value={filters?.search}
          onChange={(e) => onFilterChange("search", e?.target?.value)}
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border">
        <Button
          variant="outline"
          iconName="RotateCcw"
          iconPosition="left"
          fullWidth
          onClick={onReset}
        >
          Reset Filters
        </Button>
        <Button
          variant="default"
          iconName="Download"
          iconPosition="left"
          fullWidth
        >
          Export Results
        </Button>
      </div>
    </div>
  );
};

export default FilterPanel;
