import React, { useEffect, useState } from "react";
import { Form } from "antd";
import Icon from "../../../../../components/AppIcon";
import Button from "../../../../../components/ui/Button";

const getDocumentId = (doc, index) => doc?.id || doc?.publicId || `${doc?.tag || "doc"}_${index}`;

const getLedgerLabel = (doc, index) => {
  const tag = String(doc?.tag || "").trim();
  if (tag) return tag;
  return `Untagged ${index + 1}`;
};

const normalizeDocsForLedger = (docs) =>
  (Array.isArray(docs) ? docs : []).map((doc, index) => ({
    ...doc,
    ledgerId: getDocumentId(doc, index),
    ledgerLabel: getLedgerLabel(doc, index),
  }));

const DocumentsList = ({ form }) => {
  const watchedPostfileDocuments = Form.useWatch("postfile_documents", form);
  const watchedLedgerDocuments = Form.useWatch("postfile_documents_ledger", form);
  const [ledgerDocuments, setLedgerDocuments] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [manualLabel, setManualLabel] = useState("");

  useEffect(() => {
    const incoming = normalizeDocsForLedger(watchedPostfileDocuments || []);
    const savedLedger = normalizeDocsForLedger(watchedLedgerDocuments || []);

    setLedgerDocuments((prev) => {
      const currentBase = prev.length > 0 ? prev : savedLedger;
      if (currentBase.length === 0) return incoming;

      const incomingMap = new Map(incoming.map((doc) => [doc.ledgerId, doc]));
      const merged = currentBase
        .filter((doc) => incomingMap.has(doc.ledgerId) || doc.isManualLedger)
        .map((doc) =>
          incomingMap.has(doc.ledgerId) ? { ...incomingMap.get(doc.ledgerId) } : doc,
        );

      incoming.forEach((doc) => {
        if (!merged.some((item) => item.ledgerId === doc.ledgerId)) {
          merged.push(doc);
        }
      });

      return merged;
    });
  }, [watchedPostfileDocuments, watchedLedgerDocuments]);

  const totalDocuments = ledgerDocuments.length;
  const updateLedgerOrder = (nextDocs) => {
    setLedgerDocuments(nextDocs);
    form.setFieldsValue({
      postfile_documents_ledger: nextDocs.map(({ ledgerId, ledgerLabel, ...doc }) => doc),
    });
  };

  const addManualLedgerDocument = () => {
    const label = manualLabel.trim();
    if (!label) return;

    const manualDoc = {
      id: `manual_${Date.now()}`,
      tag: label,
      status: "Manual Entry",
      uploadedBy: "Ledger",
      uploadedAt: new Date().toLocaleDateString("en-IN"),
      isManualLedger: true,
    };

    updateLedgerOrder([...ledgerDocuments, ...normalizeDocsForLedger([manualDoc])]);
    setManualLabel("");
  };

  const removeLedgerDocument = (ledgerId) => {
    updateLedgerOrder(ledgerDocuments.filter((doc) => doc.ledgerId !== ledgerId));
  };

  const handleDragStart = (docId) => {
    setDraggingId(docId);
  };

  const handleDrop = (targetId) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }

    const nextDocs = [...ledgerDocuments];
    const fromIndex = nextDocs.findIndex((doc) => doc.ledgerId === draggingId);
    const toIndex = nextDocs.findIndex((doc) => doc.ledgerId === targetId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggingId(null);
      return;
    }

    const [moved] = nextDocs.splice(fromIndex, 1);
    nextDocs.splice(toIndex, 0, moved);
    updateLedgerOrder(nextDocs);
    setDraggingId(null);
  };

  const exportLedger = () => {
    const rows = ledgerDocuments.map((doc, index) => ({
      Sequence: index + 1,
      "Document Tag": doc.ledgerLabel,
      Source: doc.isPreFile ? "Synced" : "Uploaded",
      Status: doc.status || "-",
      "Uploaded By": doc.uploadedBy || "-",
      "Uploaded At": doc.uploadedAt || "-",
    }));

    const headers = Object.keys(rows[0] || {});
    if (!headers.length) return;

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = String(row[header] ?? "");
            return value.includes(",") ? `"${value.replace(/"/g, '""')}"` : value;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Documents_Ledger.csv");
    link.click();
  };

  if (totalDocuments === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon name="ListOrdered" size={28} />
        </div>
        <p className="text-base font-semibold text-foreground">No documents in ledger yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add and tag files in Document Management. They will appear here in dispatch order.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-border/70 bg-card p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.14)] dark:bg-black/20 md:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Icon name="ListOrdered" size={20} />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Bank Dispatch
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Arrange the exact physical paper sequence sent to the bank. This ledger is sourced from Document Management and shows tag names only.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-muted/20 p-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportLedger}
            className="h-10 rounded-xl border-sky-200 bg-sky-50 px-4 text-sky-700 hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:bg-sky-500/15"
          >
            <Icon name="FileSpreadsheet" size={14} />
            Export Ledger
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-10 rounded-xl border-emerald-200 bg-emerald-50 px-4 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/15"
          >
            <Icon name="Printer" size={14} />
            Print
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-foreground">Dispatch Sequence</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Drag rows using the handle to reorder the bank paper stack.
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          {totalDocuments} rows
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-border/70 bg-muted/20 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-sm font-semibold text-foreground">Add Manual Ledger Row</div>
            <div className="text-xs text-muted-foreground">
              Add dispatch-only papers directly here. These rows join the same sortable bank sequence.
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <input
              type="text"
              value={manualLabel}
              onChange={(e) => setManualLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addManualLedgerDocument();
                }
              }}
              placeholder="Enter paper name or tag"
              className="h-10 min-w-[260px] rounded-xl border border-border/80 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-300 dark:border-slate-800 dark:bg-white/5 dark:placeholder:text-slate-500"
            />
            <Button
              variant="default"
              size="sm"
              onClick={addManualLedgerDocument}
              disabled={!manualLabel.trim()}
              className="h-10 rounded-xl bg-slate-900 px-4 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <Icon name="Plus" size={14} />
              Add Row
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {ledgerDocuments.map((doc, index) => (
          <div
            key={doc.ledgerId}
            draggable
            onDragStart={() => handleDragStart(doc.ledgerId)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(doc.ledgerId)}
            onDragEnd={() => setDraggingId(null)}
            className={`flex items-center gap-3 rounded-[22px] border px-4 py-3 transition ${
              draggingId === doc.ledgerId
                ? "border-slate-400 bg-slate-100/80 opacity-70 dark:border-slate-600 dark:bg-slate-800/70"
                : doc.isPreFile
                  ? "border-sky-200/80 bg-sky-50/70 hover:border-sky-300 hover:bg-sky-50 dark:border-sky-900/60 dark:bg-sky-950/20 dark:hover:bg-sky-950/30"
                  : doc.isManualLedger
                    ? "border-emerald-200/80 bg-emerald-50/60 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
                    : "border-slate-200/80 bg-white/90 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-white/5 dark:hover:bg-white/10"
            }`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${
              doc.isPreFile
                ? "bg-sky-600 text-white dark:bg-sky-300 dark:text-slate-950"
                : doc.isManualLedger
                  ? "bg-emerald-600 text-white dark:bg-emerald-300 dark:text-slate-950"
                  : "bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-950"
            }`}>
              {index + 1}
            </div>

            <button
              type="button"
              className={`flex h-10 w-10 shrink-0 cursor-grab items-center justify-center rounded-2xl border text-muted-foreground active:cursor-grabbing ${
                doc.isPreFile
                  ? "border-sky-200/80 bg-white/70 dark:border-sky-900/60 dark:bg-sky-950/20"
                  : doc.isManualLedger
                    ? "border-emerald-200/80 bg-white/70 dark:border-emerald-900/60 dark:bg-emerald-950/20"
                    : "border-slate-200/80 bg-white/70 dark:border-slate-800 dark:bg-slate-950/20"
              }`}
              aria-label="Drag to reorder"
            >
              <Icon name="GripVertical" size={18} />
            </button>

            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-foreground">
                {doc.ledgerLabel}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className={`rounded-full px-2.5 py-1 ${
                  doc.isPreFile
                    ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200"
                    : doc.isManualLedger
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }`}>
                  {doc.isPreFile ? "Synced" : doc.isManualLedger ? "Manual" : "Uploaded"}
                </span>
                {doc.status && (
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    {doc.status}
                  </span>
                )}
                {doc.uploadedAt && (
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    {doc.uploadedAt}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeLedgerDocument(doc.ledgerId)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-white/80 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
              aria-label="Remove row"
            >
              <Icon name="Trash2" size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentsList;
