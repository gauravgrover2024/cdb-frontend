/**
 * Shared Ant Design theme for Loan PreFile and Insurance flows.
 *
 * Design rules enforced here:
 *  - All interactive fields are the same height (44 px / size="large")
 *  - Border stays neutral gray on hover — no color change
 *  - Focus shows a clean slate-400 border with zero box-shadow / glow
 *  - Font size 14 px, weight 500 for field values, unified placeholder color
 *  - Border radius 10 px across every field type
 *  - Zero outline / controlOutlineWidth so nothing bleeds outside the field
 */

export const loanInsuranceAntdPopupContainer = (triggerNode) =>
  triggerNode?.parentElement || document.body;

// Design tokens shared across components
const BORDER_DEFAULT  = "#d1d5db"; // gray-300  — resting border
const BORDER_FOCUS    = "#94a3b8"; // slate-400 — active/focus border (no glow)
const BORDER_RADIUS   = 10;
const FIELD_HEIGHT_LG = 44;
const FONT_SIZE_FIELD = 14;
const COLOR_PLACEHOLDER = "#94a3b8"; // slate-400

export const loanInsuranceAntdTheme = {
  token: {
    fontFamily:
      "Manrope, Satoshi, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    borderRadius: BORDER_RADIUS,
    // Completely suppress the focus ring / outline that AntD adds on top of
    // the border — the border itself is enough visual feedback.
    controlOutlineWidth: 0,
    controlOutline: "transparent",
    controlHeightLarge: FIELD_HEIGHT_LG,
    // Consistent border across all components
    colorBorder: BORDER_DEFAULT,
    colorSplit: BORDER_DEFAULT,
    // Placeholder
    colorTextPlaceholder: COLOR_PLACEHOLDER,
  },
  components: {
    /* ── Input / AutoComplete ───────────────────────────────────────────── */
    Input: {
      paddingInline: 12,
      fontSize: FONT_SIZE_FIELD,
      // No colour change on hover
      hoverBorderColor: BORDER_DEFAULT,
      // Clean border on focus, zero glow
      activeBorderColor: BORDER_FOCUS,
      activeShadow: "none",
      errorActiveShadow: "none",
      warningActiveShadow: "none",
    },
    /* ── Select ─────────────────────────────────────────────────────────── */
    Select: {
      fontSize: FONT_SIZE_FIELD,
      optionFontSize: FONT_SIZE_FIELD,
      optionHeight: 38,
      showArrowPaddingInlineEnd: 28,
      // Prevent hover border change
      hoverBorderColor: BORDER_DEFAULT,
      activeBorderColor: BORDER_FOCUS,
      activeOutlineColor: "transparent",
      // Single-item (non-multi) large height
      singleItemHeightLG: FIELD_HEIGHT_LG,
    },
    /* ── DatePicker ─────────────────────────────────────────────────────── */
    DatePicker: {
      fontSize: FONT_SIZE_FIELD,
      cellHeight: 28,
      hoverBorderColor: BORDER_DEFAULT,
      activeBorderColor: BORDER_FOCUS,
      activeBoxShadow: "none",
      activeShadow: "none",
    },
    /* ── InputNumber ────────────────────────────────────────────────────── */
    InputNumber: {
      fontSize: FONT_SIZE_FIELD,
      hoverBorderColor: BORDER_DEFAULT,
      activeBorderColor: BORDER_FOCUS,
      activeShadow: "none",
    },
    /* ── AutoComplete ───────────────────────────────────────────────────── */
    AutoComplete: {
      optionHeight: 38,
      optionFontSize: FONT_SIZE_FIELD,
    },
  },
};
