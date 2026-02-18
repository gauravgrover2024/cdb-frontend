import React, { useMemo, useState } from "react";
import Icon from "../AppIcon";
import { Checkbox, Pagination } from "antd";
import LoadingSpinner from "./LoadingSpinner";


const DataTable = ({
  columns,
  dataSource,
  rowKey = "_id",
  onRowClick,
  emptyText = "No records found",
  caption,
  loading = false,
  selection = { selectedRowKeys: [], onChange: () => {} },
  pagination = { current: 1, pageSize: 10, total: 0, onChange: () => {} }
}) => {
  const [sortConfig, setSortConfig] = useState(null);

  // Sorting logic
  const sortedData = useMemo(() => {
    let sortableItems = [...dataSource];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [dataSource, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    if (checked) {
      const allKeys = dataSource.map(item => item[rowKey] || item.id || item._id);
      selection.onChange(allKeys);
    } else {
      selection.onChange([]);
    }
  };

  const handleSelectRow = (e, key) => {
    e.stopPropagation();
    const checked = e.target.checked;
    let newKeys = [...selection.selectedRowKeys];
    if (checked) {
      newKeys.push(key);
    } else {
      newKeys = newKeys.filter(k => k !== key);
    }
    selection.onChange(newKeys);
  };

  const allSelected = dataSource.length > 0 && selection.selectedRowKeys.length === dataSource.length;
  const someSelected = selection.selectedRowKeys.length > 0 && selection.selectedRowKeys.length < dataSource.length;

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Modern Table Container with Border */}
      <div className="relative overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <LoadingSpinner text="Fetching Data..." />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm" role="table">
            {caption && (
              <caption className="px-6 py-4 text-left text-base font-semibold text-foreground bg-muted/30 border-b border-border/60">
                {caption}
              </caption>
            )}

            {/* Enhanced Table Header */}
            <thead className="sticky top-0 z-20 bg-muted/50 backdrop-blur-sm border-b-2 border-primary/20">
              <tr role="row">
                {selection && (
                  <th
                    scope="col"
                    className="px-4 py-3.5 text-left font-semibold text-muted-foreground w-12 bg-muted/50 border-b-2 border-primary/20"
                  >
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={handleSelectAll}
                      className="hover:scale-110 transition-transform"
                    />
                  </th>
                )}
                {columns.map((col) => {
                  const isFixedRight = col.fixed === 'right';
                  const isFixedLeft = col.fixed === 'left';
                  const fixedClass = isFixedRight
                    ? 'sticky right-0 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] bg-muted/50 backdrop-blur-sm'
                    : isFixedLeft
                    ? 'sticky left-0 z-10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] bg-muted/50 backdrop-blur-sm'
                    : '';

                  return (
                    <th
                      key={col.key || col.dataIndex}
                      scope="col"
                      className={`px-4 py-3.5 text-left font-semibold text-muted-foreground whitespace-nowrap border-b-2 border-primary/20 ${fixedClass} ${col.className || ''} ${
                        col.sorter ? 'cursor-pointer select-none hover:bg-muted/70 transition-colors' : ''
                      }`}
                      onClick={col.sorter ? () => requestSort(col.dataIndex || col.key) : undefined}
                      aria-sort={sortConfig?.key === (col.dataIndex || col.key) ? sortConfig.direction : "none"}
                      style={{ width: col.width, minWidth: col.minWidth }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wider font-bold">{col.title}</span>
                        {col.sorter && (
                          <span className="text-muted-foreground/50">
                            {sortConfig?.key === (col.dataIndex || col.key) ? (
                              <Icon
                                name={sortConfig.direction === 'ascending' ? 'ChevronUp' : 'ChevronDown'}
                                className="w-4 h-4 text-primary"
                              />
                            ) : (
                              <Icon name="ChevronsUpDown" className="w-4 h-4" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Enhanced Table Body */}
            <tbody className="divide-y divide-border/40">
              {sortedData.length > 0 ? (
                sortedData.map((record, rowIndex) => {
                  const key = record[rowKey] || record.id || record._id;
                  const isSelected = selection.selectedRowKeys.includes(key);
                  
                  // Modern row styling with hover and selection states
                  const rowBgClass = isSelected
                    ? 'bg-primary/5 hover:bg-primary/10'
                    : 'bg-background hover:bg-muted/30';
                  
                  // Sticky bg needs to be solid to hide scrolling content
                  const stickyBgClass = isSelected
                    ? 'bg-background' // Fallback to solid background for sticky to avoid transparency
                    : 'bg-background';

                  return (
                    <tr
                      key={key}
                      className={`group transition-all duration-150 ${rowBgClass} ${
                        onRowClick ? 'cursor-pointer' : ''
                      } border-b border-border/30 last:border-b-0`}
                      onClick={() => onRowClick?.(record)}
                      role="row"
                    >
                      {selection && (
                        <td
                          className={`px-4 py-3 text-center align-middle ${stickyBgClass} group-hover:bg-muted/30`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(e, key)}
                            className="hover:scale-110 transition-transform"
                          />
                        </td>
                      )}
                      {columns.map((col) => {
                        const value = record[col.dataIndex];
                        const isFixedRight = col.fixed === 'right';
                        const isFixedLeft = col.fixed === 'left';
                        
                        // For sticky columns, we need a SOLID background color that matches the row's "perceived" color
                        // But since we can't easily match the subtle hover transparency, we use the solid card background
                        // and try to mimic the hover effect manually if needed, or just keep it simple/clean.
                        // Ideally, sticky columns should just use the base table background (white/dark:card).
                        const fixedClass = isFixedRight
                          ? `sticky right-0 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]` // Removed bg classes here, handled by col.className or default
                          : isFixedLeft
                          ? `sticky left-0 z-10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]`
                          : '';

                        // Determine background for sticky cells:
                        // If it's fixed, we MUST enforce a background color (passed via col.className or default).
                        // If no col.className is passed for a fixed column, we default to bg-card/bg-background.
                        const cellBg = (isFixedRight || isFixedLeft) 
                            ? (col.className?.includes('bg-') ? '' : 'bg-background dark:bg-card') 
                            : '';

                        return (
                          <td
                            key={col.key || col.dataIndex}
                            data-label={col.title}
                            className={`px-4 py-3 align-middle text-foreground/90 border-b border-primary/20 ${fixedClass} ${col.className || ''} ${cellBg}`}
                          >
                            {col.render ? col.render(value, record, rowIndex) : (
                              <span className="text-sm">{value || "—"}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : !loading && (
                <tr>
                  <td
                    colSpan={columns.length + (selection ? 1 : 0)}
                    className="px-6 py-16 text-center"
                  >
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Icon name="FileX" className="w-12 h-12 opacity-40" />
                      <p className="text-sm font-medium">{emptyText}</p>
                      <p className="text-xs opacity-60">No data available to display</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Accent Bottom Border - Visual separator after all data */}
        {sortedData.length > 0 && !loading && (
          <div className="h-1 bg-gradient-to-r from-primary/30 via-primary/60 to-primary/30" />
        )}
      </div>

      {/* Modern Pagination Footer */}
      {pagination && dataSource.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="hidden sm:inline">Showing</span>
            <span className="font-semibold text-foreground">
              {(pagination.current - 1) * pagination.pageSize + 1}
            </span>
            <span>to</span>
            <span className="font-semibold text-foreground">
              {Math.min(pagination.current * pagination.pageSize, pagination.total)}
            </span>
            <span>of</span>
            <span className="font-semibold text-foreground">{pagination.total}</span>
            <span className="hidden sm:inline">entries</span>
          </div>
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onChange={pagination.onChange}
            showSizeChanger={false}
            className="flex-shrink-0"
          />
        </div>
      )}

      {/* Mobile-Responsive Styles */}
          <style>{`
            /* Optional: Add custom scrollbar styling if needed */
            .overflow-x-auto::-webkit-scrollbar {
              height: 8px;
            }
            .overflow-x-auto::-webkit-scrollbar-track {
              background: transparent;
            }
            .overflow-x-auto::-webkit-scrollbar-thumb {
              background-color: rgba(156, 163, 175, 0.5);
              border-radius: 4px;
            }
            .overflow-x-auto::-webkit-scrollbar-thumb:hover {
              background-color: rgba(107, 114, 128, 0.8);
            }
          `}</style>
    </div>
  );
};

export default DataTable;