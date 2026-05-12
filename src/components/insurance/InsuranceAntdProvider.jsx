import React from "react";
import { ConfigProvider } from "antd";
import {
  loanInsuranceAntdPopupContainer,
  loanInsuranceAntdTheme,
} from "../../theme/loanInsuranceAntdTheme";

/** Loan PreFile–aligned Ant Design tokens for Insurance routes + wizard */
export default function InsuranceAntdProvider({ children }) {
  return (
    <ConfigProvider
      getPopupContainer={loanInsuranceAntdPopupContainer}
      theme={loanInsuranceAntdTheme}
    >
      {children}
    </ConfigProvider>
  );
}
