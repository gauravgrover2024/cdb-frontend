import { useEffect, useMemo, useState } from "react";
import { SAMPLE_LEADS, STORAGE_KEY } from "../constants";
import { normalizeLeadRecord } from "../utils/leadUtils";

export default function useLeads() {
  const [leads, setLeads] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw
        ? JSON.parse(raw).map(normalizeLeadRecord)
        : SAMPLE_LEADS.map(normalizeLeadRecord);
    } catch {
      return SAMPLE_LEADS.map(normalizeLeadRecord);
    }
  });
  const [selectedId, setSelectedId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeAction, setActiveAction] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }, [leads]);

  const selected = useMemo(
    () => leads.find((lead) => lead.id === selectedId) || null,
    [leads, selectedId],
  );

  const patch = (id, data, activity = null) => {
    setLeads((current) =>
      current.map((lead) =>
        lead.id !== id
          ? lead
          : {
              ...lead,
              ...data,
              activities: activity ? [activity, ...(lead.activities || [])] : lead.activities || [],
            },
      ),
    );
  };

  const openCard = (id) => {
    setSelectedId(id);
    setDrawerOpen(true);
    setActiveAction(null);
  };

  return {
    leads,
    setLeads,
    selectedId,
    setSelectedId,
    selected,
    drawerOpen,
    setDrawerOpen,
    activeAction,
    setActiveAction,
    patch,
    openCard,
  };
}
