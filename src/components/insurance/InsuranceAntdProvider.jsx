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
