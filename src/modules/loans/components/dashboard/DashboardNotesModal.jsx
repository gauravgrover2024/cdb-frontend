import React, { useState, useEffect } from "react";
import { message, Modal, Input, Button } from "antd";
import Icon from "../../../../components/AppIcon";
import { loansApi } from "../../../../api/loans";

const DashboardNotesModal = ({ open, loan, onClose, onRefresh }) => {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (loan) {
      setNotes(loan.loan_notes || "");
    }
  }, [loan]);

  if (!loan) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      const loanId = loan._id || loan.loanId;
      await loansApi.update(loanId, { loan_notes: notes });
      message.success("Notes updated successfully");
      onRefresh?.();
      onClose();
    } catch (error) {
      console.error("Error updating notes:", error);
      message.error("Failed to update notes");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete all notes for this loan?")) return;
    setLoading(true);
    try {
      const loanId = loan._id || loan.loanId;
      await loansApi.update(loanId, { loan_notes: "" });
      setNotes("");
      message.success("Notes deleted successfully");
      onRefresh?.();
      onClose();
    } catch (error) {
      console.error("Error deleting notes:", error);
      message.error("Failed to delete notes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
      title={
        <div className="flex items-center gap-2">
          <Icon name="StickyNote" className="text-amber-500" />
          <span>Internal Notes</span>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <div className="bg-muted/30 p-3 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Loan / Customer</p>
          <p className="text-sm font-semibold text-foreground">
            {loan.loanId || loan.loan_number} — {loan.customerName}
          </p>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
            Note Content
          </label>
          <Input.TextArea
            rows={8}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write internal notes here... (Visible only to staff)"
            className="rounded-xl border-border focus:border-primary"
          />
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button
            type="text"
            danger
            icon={<Icon name="Trash2" size={14} />}
            onClick={handleDelete}
            loading={loading}
            className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest"
          >
            Clear All
          </Button>

          <div className="flex items-center gap-3">
            <Button
              onClick={onClose}
              className="rounded-xl font-bold px-6"
            >
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleSave}
              loading={loading}
              className="rounded-xl font-bold px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              Save Notes
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DashboardNotesModal;
