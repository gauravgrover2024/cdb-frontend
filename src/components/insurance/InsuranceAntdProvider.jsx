import React, { useEffect } from "react";
import { ConfigProvider, message } from "antd";
import {
  loanInsuranceAntdPopupContainer,
  loanInsuranceAntdTheme,
} from "../../theme/loanInsuranceAntdTheme";

/** Loan PreFile–aligned Ant Design tokens for Insurance routes + wizard */
export default function InsuranceAntdProvider({ children }) {
  useEffect(() => {
    const applyCenteredMessageTop = () => {
      if (typeof window === "undefined") return;
      const centerTop = Math.max(24, Math.floor(window.innerHeight / 2 - 28));
      message.config({ top: centerTop });
    };

    applyCenteredMessageTop();
    window.addEventListener("resize", applyCenteredMessageTop);
    return () => {
      window.removeEventListener("resize", applyCenteredMessageTop);
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
