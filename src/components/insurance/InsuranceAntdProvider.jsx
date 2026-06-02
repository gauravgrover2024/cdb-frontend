import React, { useEffect } from "react";
import { ConfigProvider, message } from "antd";
import {
  loanInsuranceAntdPopupContainer,
  loanInsuranceAntdTheme,
} from "../../theme/loanInsuranceAntdTheme";

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
      {children}
    </ConfigProvider>
  );
}
