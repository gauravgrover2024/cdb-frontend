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
    controlHeightLarge: 44,
  },
  components: {
    Select: {
      optionFontSize: 14,
      optionHeight: 38,
      showArrowPaddingInlineEnd: 28,
    },
    Input: {
      paddingInline: 12,
    },
    InputNumber: {},
    AutoComplete: {
      optionHeight: 38,
      optionFontSize: 14,
    },
    DatePicker: {
      cellHeight: 28,
    },
  },
};
