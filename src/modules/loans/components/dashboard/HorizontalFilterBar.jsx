import React, { useMemo, useState, useEffect } from "react";
import Icon from "../../../../components/AppIcon";
import Button from "../../../../components/ui/Button";

const HorizontalFilterBar = ({ filters, onFilterChange, onResetFilters, onRefresh, onNewCase }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Sync local search state with filters prop
  useEffect(() => {
    setSearchValue(filters?.searchQuery || "");
  }, [filters?.searchQuery]);

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
    { value: "New", label: "New", dot: "bg-blue-500 dark:bg-blue-400" },
    { value: "File Login", label: "File Login", dot: "bg-yellow-500 dark:bg-yellow-400" },
    { value: "Pending", label: "Pending", dot: "bg-amber-500 dark:bg-amber-400" },
    { value: "In Progress", label: "In Progress", dot: "bg-amber-400 dark:bg-amber-300" },
    { value: "Approved", label: "Approved", dot: "bg-green-500 dark:bg-green-400" },
    { value: "Disbursed", label: "Disbursed", dot: "bg-green-600 dark:bg-green-500" },
    { value: "Rejected", label: "Rejected", dot: "bg-red-500 dark:bg-red-400" },
    { value: "On Hold", label: "On Hold", dot: "bg-gray-500 dark:bg-gray-400" },
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
    let count =
      (filters?.loanTypes?.length || 0) +
      (filters?.stages?.length || 0) +
      (filters?.statuses?.length || 0) +
      (filters?.agingBuckets?.length || 0) +
      (filters?.amountRanges?.length || 0);
    if (filters?.searchQuery?.trim()) count += 1;
    if (filters?.approvedToday) count += 1;
    return count;
  }, [filters]);

  const removeFilter = (category, value) => {
    const newValues = (filters?.[category] || []).filter((v) => v !== value);
    onFilterChange(category, newValues);
  };

  const handleSearch = (value) => {
    setSearchValue(value);
    onFilterChange("searchQuery", value);
  };

  const Chip = ({ label, onRemove }) => (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary/90 text-xs border border-primary/20 dark:border-primary/30">
      {label}
      <button onClick={onRemove} className="hover:text-destructive dark:hover:text-red-400 transition-colors">
        <Icon name="X" size={12} />
      </button>
    </span>
  );

  const TogglePill = ({ selected, children, onClick, withDot, dotClass, color = "primary" }) => {
    const colorStyles = {
      primary: selected ? "bg-primary text-primary-foreground border-primary" : "hover:border-primary hover:bg-primary/5",
      indigo: selected ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-100" : "hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10",
      amber: selected ? "bg-amber-500 text-white border-amber-500 shadow-amber-100" : "hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10",
      emerald: selected ? "bg-emerald-600 text-white border-emerald-600 shadow-emerald-100" : "hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10",
      blue: selected ? "bg-blue-600 text-white border-blue-600 shadow-blue-100" : "hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10",
      rose: selected ? "bg-rose-600 text-white border-rose-600 shadow-rose-100" : "hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10",
    };

    return (
      <button
        onClick={onClick}
        className={`px-3 py-1.5 rounded-xl text-xs border transition-all duration-200 inline-flex items-center gap-2 font-semibold shadow-sm
          ${selected ? colorStyles[color] : `bg-card text-muted-foreground border-border ${colorStyles[color]}`}
        `}
      >
        {withDot && <span className={`w-2 h-2 rounded-full ${dotClass} ${selected ? 'ring-2 ring-white/50' : ''}`} />}
        {children}
      </button>
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header with Search */}
      <div className="px-4 py-3 border-b border-border space-y-3">
        {/* Global Search Bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search across all fields: Loan ID, Customer, Vehicle, Bank, Mobile, City, Source..."
              className="w-full h-10 pl-10 pr-3 py-2 border border-border bg-background rounded-lg text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-muted-foreground"
            />
          </div>
          
          {/* Refresh Button */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              iconName="RefreshCw"
              onClick={onRefresh}
              className="h-10 px-3"
            >
              Refresh
            </Button>
          )}
          
          {/* New Case Button */}
          {onNewCase && (
            <Button
              variant="default"
              size="sm"
              iconName="Plus"
              onClick={onNewCase}
              className="h-10 px-4"
            >
              New Case
            </Button>
          )}
        </div>

        {/* Filter Toggle and Clear */}
        <div className="flex items-center justify-between">
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
      </div>

      {/* Chips */}
      {activeFilterCount > 0 && !isExpanded && (
        <div className="px-4 py-3 flex flex-wrap gap-2">
          {filters?.searchQuery?.trim() && (
            <Chip
              key="search"
              label={`Search: "${filters.searchQuery.trim().slice(0, 20)}${filters.searchQuery.trim().length > 20 ? "…" : ""}"`}
              onRemove={() => handleSearch("")}
            />
          )}
          {filters?.approvedToday && (
            <Chip
              key="approvedToday"
              label="Approved today"
              onRemove={() => onFilterChange("approvedToday", false)}
            />
          )}
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
                    color="indigo"
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
                    color="amber"
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
                    color="emerald"
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
                    color="blue"
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
                    color="rose"
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
