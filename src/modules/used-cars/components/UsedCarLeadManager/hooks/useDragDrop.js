import { useState } from "react";
import { getNextStatusKey } from "../utils/leadUtils";

export default function useDragDrop(leads) {
  const [dragLeadId, setDragLeadId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const handleDragStartCard = (event, leadId) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", leadId);
    setDragLeadId(leadId);
  };

  const handleDragEndCard = () => {
    setDragLeadId(null);
    setDragOverStatus(null);
  };

  const handleDragOverColumn = (event, status) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  };

  const handleDragLeaveColumn = (status) => {
    setDragOverStatus((current) => (current === status ? null : current));
  };

  const handleDropLead = (event, status) => {
    event.preventDefault();
    const leadId = event.dataTransfer.getData("text/plain") || dragLeadId;
    setDragLeadId(null);
    setDragOverStatus(null);
    if (!leadId) return;
    const lead = leads.find((item) => item.id === leadId);
    if (!lead || lead.status === status) return;
    setDropTarget({ leadId, status });
  };

  const openQuickAdvance = (lead) => {
    const nextStatus = getNextStatusKey(lead.status);
    if (!nextStatus) return;
    setDropTarget({ leadId: lead.id, status: nextStatus });
  };

  return {
    dragOverStatus,
    dropTarget,
    setDropTarget,
    handleDragStartCard,
    handleDragEndCard,
    handleDragOverColumn,
    handleDragLeaveColumn,
    handleDropLead,
    openQuickAdvance,
  };
}
