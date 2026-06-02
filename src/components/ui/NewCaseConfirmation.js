import { Modal } from "antd";

export const openNewCaseConfirmation = ({ moduleLabel, onSaveAndNew }) => {
  Modal.confirm({
    title: `Save and Exit ${moduleLabel} Case?`,
    content: `You have unsaved changes. Save your progress before continuing?`,
    okText: "Save and Exit",
    cancelText: "Cancel",
    okButtonProps: {
      className: "bg-emerald-600 hover:bg-emerald-700 border-emerald-600",
    },
    cancelButtonProps: {
      className: "border-slate-300",
    },
    maskClosable: false,
    onOk: () => {
      onSaveAndNew?.();
    },
    onCancel: () => {
      // Do nothing - user cancelled the operation
    },
  });
};
