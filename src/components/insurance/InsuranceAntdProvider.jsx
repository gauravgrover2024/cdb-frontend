import React, { useEffect } from "react";
import { ConfigProvider, message } from "antd";
import {
  loanInsuranceAntdPopupContainer,
  loanInsuranceAntdTheme,
} from "../../theme/loanInsuranceAntdTheme";

/**
 * Runtime style patch injected alongside Ant Design's own CSS-in-JS styles.
 * Static CSS files load BEFORE Ant Design's runtime CSS injection, so AntD
 * always overwrites them. A <style> tag rendered inside React loads at the
 * same time as AntD's injected CSS, but because it's declared AFTER AntD's
 * StyleProvider in the DOM, it wins the cascade without needing !important.
 */
const INSURANCE_FIELD_PATCH = `
  /* Normalise font-size for ALL Input sizes to 14px */
  .insurance-case-skin .ant-input,
  .insurance-case-skin .ant-input-lg,
  .insurance-case-skin .ant-input-affix-wrapper > input.ant-input,
  .insurance-case-skin .ant-input-affix-wrapper-lg > input.ant-input,
  .insurance-case-skin .ant-input-affix-wrapper > input.ant-input-lg,
  .insurance-case-skin .ant-input-affix-wrapper-lg > input.ant-input-lg,
  .insurance-case-skin .ant-input-number-input,
  .insurance-case-skin .ant-input-number-lg .ant-input-number-input,
  .insurance-case-skin .ant-picker-input > input,
  .insurance-case-skin .ant-select-selection-item,
  .insurance-case-skin .ant-select-selection-search-input {
    font-size: 14px !important;
  }

  /* Normalise placeholder to 14px weight-400 */
  .insurance-case-skin .ant-input::placeholder,
  .insurance-case-skin .ant-input-lg::placeholder,
  .insurance-case-skin .ant-input-affix-wrapper > input::placeholder,
  .insurance-case-skin .ant-input-affix-wrapper-lg > input::placeholder,
  .insurance-case-skin .ant-input-number-input::placeholder,
  .insurance-case-skin .ant-input-number-lg .ant-input-number-input::placeholder,
  .insurance-case-skin .ant-picker-input > input::placeholder,
  .insurance-case-skin .ant-select-selection-placeholder {
    font-size: 14px !important;
    font-weight: 400 !important;
    color: #94a3b8 !important;
  }

  /* ── Height normalisation ────────────────────────────────────────────────
     Force every form control to 44 px (the design spec height) regardless
     of whether size="large" was passed. Excludes size="small" controls
     (ant-picker-small, ant-input-number-sm) which are intentionally compact.
  ─────────────────────────────────────────────────────────────────────────── */

  /* DatePicker — outer wrapper */
  .insurance-case-skin .ant-picker:not(.ant-picker-small) {
    min-height: 44px !important;
    width: 100% !important;
  }

  /* InputNumber — outer wrapper (excludes small & group wrappers) */
  .insurance-case-skin .ant-input-number:not(.ant-input-number-sm):not(.ant-input-number-in-form-item) {
    min-height: 44px !important;
    width: 100% !important;
  }
  .insurance-case-skin .ant-input-number-group-wrapper:not(.ant-input-number-group-wrapper-sm) {
    min-height: 44px !important;
    width: 100% !important;
  }

  /* InputNumber — inner input row must fill the wrapper */
  .insurance-case-skin .ant-input-number:not(.ant-input-number-sm) .ant-input-number-input-wrap,
  .insurance-case-skin .ant-input-number-group-wrapper:not(.ant-input-number-group-wrapper-sm) .ant-input-number-input-wrap {
    height: 100% !important;
  }
  .insurance-case-skin .ant-input-number:not(.ant-input-number-sm) .ant-input-number-input,
  .insurance-case-skin .ant-input-number-group-wrapper:not(.ant-input-number-group-wrapper-sm) .ant-input-number-input {
    height: 42px !important;
    min-height: 42px !important;
  }

  /* ── Input / affix-wrapper — pin to 44px to match Select singleItemHeightLG ──
     Select uses an explicit singleItemHeightLG=44 token.
     Input derives height from a padding-block formula which can exceed 44px
     depending on font-metrics and box-sizing.  Force them equal here.
     Excludes textarea and small-size wrappers.
  ─────────────────────────────────────────────────────────────────────────── */
  .insurance-case-skin .ant-input-affix-wrapper:not(.ant-input-affix-wrapper-textarea):not(.ant-input-affix-wrapper-sm) {
    height: 44px !important;
    min-height: 44px !important;
    box-sizing: border-box !important;
    display: flex !important;
    align-items: center !important;
    width: 100% !important;
  }

  /* ── Full-width safety net ───────────────────────────────────────────────
     Ensures Select / AutoComplete / DatePicker always fill their container
     even when the component is rendered without an explicit field-wrap class.
  ─────────────────────────────────────────────────────────────────────────── */
  .insurance-case-skin .ant-select:not(.ant-select-customize-input) {
    width: 100% !important;
    max-width: 100% !important;
  }

  /* quote-control — Step 4 uses this class on Select/InputNumber/AutoComplete */
  .insurance-case-skin .quote-control,
  .insurance-case-skin .quote-control .ant-select,
  .insurance-case-skin .quote-control .ant-input-number,
  .insurance-case-skin .quote-control .ant-picker {
    width: 100% !important;
    max-width: 100% !important;
  }
`;

/** Loan PreFile–aligned Ant Design tokens for Insurance routes + wizard */
export default function InsuranceAntdProvider({ children }) {
  useEffect(() => {
    // Configure Ant Design messages to display at the top center of the viewport (80px from top)
    message.config({ top: 80 });
    return () => {
      // Revert to default top configuration when provider unmounts
      message.config({ top: 8 });
    };
  }, []);

  return (
    <ConfigProvider
      getPopupContainer={loanInsuranceAntdPopupContainer}
      theme={loanInsuranceAntdTheme}
    >
      {/* Runtime style patch — injected after AntD's CSS-in-JS so it wins cascade */}
      <style>{INSURANCE_FIELD_PATCH}</style>
      {children}
    </ConfigProvider>
  );
}
