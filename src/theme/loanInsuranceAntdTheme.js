/**
 * Shared Ant Design theme for Loan PreFile and Insurance flows (aligned sizing/padding/radius).
 */

export const loanInsuranceAntdPopupContainer = (triggerNode) =>
  triggerNode?.parentElement || document.body;

export const loanInsuranceAntdTheme = {
  token: {
    fontFamily:
      "Manrope, Satoshi, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    borderRadius: 14,
    controlOutlineWidth: 0,
  },
  components: {
    Select: {
      optionFontSize: 13,
      optionHeight: 36,
      showArrowPaddingInlineEnd: 28,
    },
    Input: {
      paddingBlock: 10,
      paddingInline: 12,
    },
    InputNumber: {
      paddingBlock: 10,
    },
    AutoComplete: {
      optionHeight: 36,
      optionFontSize: 13,
    },
    DatePicker: {
      cellHeight: 28,
    },
  },
};
