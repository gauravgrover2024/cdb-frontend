import {
  AutoComplete,
  Cascader,
  DatePicker,
  Input,
  Mentions,
  Select,
  TreeSelect,
} from "antd";

const applyDefaults = (component, defaults) => {
  if (!component) return;
  component.defaultProps = {
    ...(component.defaultProps || {}),
    ...defaults,
  };
};

// Global clear icon defaults for most form controls.
// Any specific field can still override with allowClear={false}.
applyDefaults(Input, { allowClear: true });
applyDefaults(Input.TextArea, { allowClear: true });
applyDefaults(Input.Search, { allowClear: true });
applyDefaults(AutoComplete, {
  allowClear: true,
  popupMatchSelectWidth: false,
  dropdownMatchSelectWidth: false,
});
applyDefaults(Select, {
  allowClear: true,
  popupMatchSelectWidth: false,
  dropdownMatchSelectWidth: false,
});
applyDefaults(TreeSelect, { allowClear: true });
applyDefaults(Cascader, { allowClear: true });
applyDefaults(Mentions, { allowClear: true });
applyDefaults(DatePicker, { allowClear: true });
applyDefaults(DatePicker.RangePicker, { allowClear: true });
