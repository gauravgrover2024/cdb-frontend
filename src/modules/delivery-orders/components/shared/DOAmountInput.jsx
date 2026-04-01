import React from "react";
import { Input } from "antd";

const toIndianNumber = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const normalized = String(value).replace(/,/g, "").trim();
  if (!normalized) return "";
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return "";
  return parsed.toLocaleString("en-IN");
};

const parseNumber = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const sanitized = String(value).replace(/[^\d-]/g, "");
  const isNegative = sanitized.startsWith("-");
  const digitsOnly = sanitized.replace(/-/g, "");
  const normalized = `${isNegative ? "-" : ""}${digitsOnly}`;
  if (!normalized) return "";
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : "";
};

const DOAmountInput = React.forwardRef(
  ({ value, onChange, disabled, style, className, ...rest }, ref) => {
    return (
      <Input
        ref={ref}
        value={toIndianNumber(value)}
        onChange={(event) => {
          const next = parseNumber(event?.target?.value);
          onChange?.(next === "" ? null : next);
        }}
        disabled={disabled}
        className={className}
        style={{
          width: "100%",
          ...style,
        }}
        inputMode="numeric"
        allowClear={!disabled}
        {...rest}
      />
    );
  },
);

export default DOAmountInput;
