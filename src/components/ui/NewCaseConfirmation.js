import { Modal } from "antd";

export const openNewCaseConfirmation = ({
  moduleLabel,
  onSaveAndNew,
  onDiscardAndStartFresh,
}) => {
  Modal.confirm({
    title: `New ${moduleLabel} Case`,
    content: `You are currently working on a ${moduleLabel.toLowerCase()} case. Would you like to save your progress before starting a new one?`,
    okText: "Save & New",
    cancelText: "Discard & Start Fresh",
    okButtonProps: {
      className: "bg-blue-600 hover:bg-blue-700 border-blue-600",
    },
    cancelButtonProps: {
      danger: true,
    },
    maskClosable: true,
    onOk: () => {
      onSaveAndNew?.();
    },
    onCancel: (e) => {
      if (e?.triggerCancel) return;
      onDiscardAndStartFresh?.();
    },
  });
};

