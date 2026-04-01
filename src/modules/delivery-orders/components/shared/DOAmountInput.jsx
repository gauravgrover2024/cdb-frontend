import React from "react";
import { InputNumber } from "antd";
import { CloseCircleFilled } from "@ant-design/icons";

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
  const normalized = String(value).replace(/[^\d.-]/g, "");
  if (!normalized) return "";
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : "";
};

const DOAmountInput = React.forwardRef(
  ({ value, onChange, disabled, style, className, ...rest }, ref) => {
    const hasValue =
      value !== undefined && value !== null && String(value).trim() !== "";

    return (
      <div style={{ position: "relative", width: "100%" }}>
        <InputNumber
          ref={ref}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={className}
          style={{
            width: "100%",
            paddingRight: !disabled && hasValue ? 26 : undefined,
            ...style,
          }}
          controls={false}
          formatter={(nextValue) => toIndianNumber(nextValue)}
          parser={(nextValue) => parseNumber(nextValue)}
          {...rest}
        />
        {!disabled && hasValue ? (
          <button
            type="button"
            aria-label="Clear amount"
            onClick={() => onChange?.(null)}
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              border: "none",
              background: "transparent",
              padding: 0,
              lineHeight: 1,
              cursor: "pointer",
              color: "#9ca3af",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CloseCircleFilled />
          </button>
        ) : null}
      </div>
    );
  },
);

export default DOAmountInput;
