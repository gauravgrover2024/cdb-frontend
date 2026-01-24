import React, { useMemo, useState } from "react";
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
    { value: "pending", label: "Pending", dot: "bg-warning" },
    { value: "in progress", label: "In Progress", dot: "bg-primary" },
    { value: "approved", label: "Approved", dot: "bg-success" },
    { value: "disbursed", label: "Disbursed", dot: "bg-success" },
    { value: "rejected", label: "Rejected", dot: "bg-error" },
    { value: "on hold", label: "On Hold", dot: "bg-muted" },
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

  const activeFilterCount = useMemo(() => {
    return (
      (filters?.loanTypes?.length || 0) +
      (filters?.stages?.length || 0) +
      (filters?.statuses?.length || 0) +
      (filters?.agingBuckets?.length || 0) +
      (filters?.amountRanges?.length || 0)
    );
  }, [filters]);

  const removeFilter = (category, value) => {
    const newValues = (filters?.[category] || []).filter((v) => v !== value);
    onFilterChange(category, newValues);
  };

  const Chip = ({ label, onRemove }) => (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs border border-primary/20">
      {label}
      <button onClick={onRemove} className="hover:text-error">
        <Icon name="X" size={12} />
      </button>
    </span>
  );

  const TogglePill = ({ selected, children, onClick, withDot, dotClass }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs border transition-colors inline-flex items-center gap-2 ${
        selected
          ? "bg-primary text-white border-primary"
          : "bg-background text-foreground border-border hover:border-primary"
      }`}
    >
      {withDot && <span className={`w-2 h-2 rounded-full ${dotClass}`} />}
      {children}
    </button>
  );

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          <Icon name="Filter" size={16} />
          Filters
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

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            iconName="X"
            onClick={onResetFilters}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Chips */}
      {activeFilterCount > 0 && !isExpanded && (
        <div className="px-4 py-3 flex flex-wrap gap-2">
          {filters?.loanTypes?.map((v) => (
            <Chip
              key={`loanType-${v}`}
              label={loanTypes.find((x) => x.value === v)?.label || v}
              onRemove={() => removeFilter("loanTypes", v)}
            />
          ))}

          {filters?.stages?.map((v) => (
            <Chip
              key={`stage-${v}`}
              label={stages.find((x) => x.value === v)?.label || v}
              onRemove={() => removeFilter("stages", v)}
            />
          ))}

          {filters?.statuses?.map((v) => (
            <Chip
              key={`status-${v}`}
              label={statuses.find((x) => x.value === v)?.label || v}
              onRemove={() => removeFilter("statuses", v)}
            />
          ))}

          {filters?.agingBuckets?.map((v) => (
            <Chip
              key={`aging-${v}`}
              label={agingBuckets.find((x) => x.value === v)?.label || v}
              onRemove={() => removeFilter("agingBuckets", v)}
            />
          ))}

          {filters?.amountRanges?.map((v) => (
            <Chip
              key={`amount-${v}`}
              label={amountRanges.find((x) => x.value === v)?.label || v}
              onRemove={() => removeFilter("amountRanges", v)}
            />
          ))}
        </div>
      )}

      {/* Expanded */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Loan type */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              Loan Type
            </div>
            <div className="flex flex-wrap gap-2">
              {loanTypes.map((t) => {
                const selected = filters?.loanTypes?.includes(t.value);
                return (
                  <TogglePill
                    key={t.value}
                    selected={selected}
                    onClick={() => {
                      const next = selected
                        ? filters.loanTypes.filter((x) => x !== t.value)
                        : [...(filters.loanTypes || []), t.value];
                      onFilterChange("loanTypes", next);
                    }}
                  >
                    {t.label}
                  </TogglePill>
                );
              })}
            </div>
          </div>

          {/* Stage */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              Stage
            </div>
            <div className="flex flex-wrap gap-2">
              {stages.map((s) => {
                const selected = filters?.stages?.includes(s.value);
                return (
                  <TogglePill
                    key={s.value}
                    selected={selected}
                    onClick={() => {
                      const next = selected
                        ? filters.stages.filter((x) => x !== s.value)
                        : [...(filters.stages || []), s.value];
                      onFilterChange("stages", next);
                    }}
                  >
                    {s.label}
                  </TogglePill>
                );
              })}
            </div>
          </div>

          {/* Status */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              Status
            </div>
            <div className="flex flex-wrap gap-2">
              {statuses.map((s) => {
                const selected = filters?.statuses?.includes(s.value);
                return (
                  <TogglePill
                    key={s.value}
                    selected={selected}
                    withDot
                    dotClass={s.dot}
                    onClick={() => {
                      const next = selected
                        ? filters.statuses.filter((x) => x !== s.value)
                        : [...(filters.statuses || []), s.value];
                      onFilterChange("statuses", next);
                    }}
                  >
                    {s.label}
                  </TogglePill>
                );
              })}
            </div>
          </div>

          {/* Aging */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              Aging
            </div>
            <div className="flex flex-wrap gap-2">
              {agingBuckets.map((b) => {
                const selected = filters?.agingBuckets?.includes(b.value);
                return (
                  <TogglePill
                    key={b.value}
                    selected={selected}
                    onClick={() => {
                      const next = selected
                        ? filters.agingBuckets.filter((x) => x !== b.value)
                        : [...(filters.agingBuckets || []), b.value];
                      onFilterChange("agingBuckets", next);
                    }}
                  >
                    {b.label}
                  </TogglePill>
                );
              })}
            </div>
          </div>

          {/* Amount */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              Amount
            </div>
            <div className="flex flex-wrap gap-2">
              {amountRanges.map((r) => {
                const selected = filters?.amountRanges?.includes(r.value);
                return (
                  <TogglePill
                    key={r.value}
                    selected={selected}
                    onClick={() => {
                      const next = selected
                        ? filters.amountRanges.filter((x) => x !== r.value)
                        : [...(filters.amountRanges || []), r.value];
                      onFilterChange("amountRanges", next);
                    }}
                  >
                    {r.label}
                  </TogglePill>
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
