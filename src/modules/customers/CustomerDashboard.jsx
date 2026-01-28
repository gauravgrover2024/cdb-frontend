// src/modules/customers/CustomerDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Fully self-contained Snow UI dashboard (no AntD)
 * - Header + actions (Refresh, New, Dark mode)
 * - Stats tiles
 * - Search (client-side)
 * - Table with View / Edit / Delete
 * - Pagination, sorting
 * - CustomerViewModal (in-file)
 * - ConfirmDeleteDialog (in-file)
 *
 * Replace your current file with this one.
 */

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";

/* ----------------- Theme system ----------------- */
const THEMES = {
  light: {
    name: "light",
    page: "#f6f8fb",
    card: "rgba(255,255,255,0.95)",
    cardSoft: "rgba(255,255,255,0.98)",
    text: "#0f172a",
    subText: "#64748b",
    accent: "#6366f1",
    border: "rgba(15,23,42,0.06)",
    shadow: "0 14px 32px rgba(15,23,42,0.06)",
  },
  dark: {
    name: "dark",
    page: "#060819",
    card: "rgba(8,10,16,0.8)",
    cardSoft: "rgba(8,10,16,0.9)",
    text: "#e6eef8",
    subText: "#94a3b8",
    accent: "#8b5cf6",
    border: "rgba(148,163,184,0.12)",
    shadow: "0 14px 32px rgba(0,0,0,0.6)",
  },
};

/* ----------------- Utilities ----------------- */
const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
};

/* ----------------- Modal & Dialog Components ----------------- */

/**
 * Lightweight modal
 */
function Modal({ open, onClose, title, children, theme }) {
  if (!open) return null;
  return (
    <div style={styles.modalOverlay}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || "modal"}
        style={{
          ...styles.modalCard,
          background: theme.card,
          boxShadow: theme.shadow,
        }}
      >
        <div style={styles.modalHeader}>
          <strong style={{ color: theme.text }}>{title}</strong>
          <button
            aria-label="Close"
            onClick={onClose}
            style={styles.iconButton(theme)}
          >
            ✕
          </button>
        </div>
        <div style={{ marginTop: 8 }}>{children}</div>
      </div>
    </div>
  );
}

/**
 * Confirm delete dialog
 */
function ConfirmDeleteDialog({ open, onCancel, onConfirm, theme, message }) {
  return (
    <Modal open={open} onClose={onCancel} title="Confirm delete" theme={theme}>
      <div style={{ color: theme.subText, marginBottom: 16 }}>{message}</div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onCancel} style={styles.btnPlain(theme)}>
          Cancel
        </button>
        <button onClick={onConfirm} style={styles.btnDanger}>
          Delete
        </button>
      </div>
    </Modal>
  );
}

/**
 * Customer view modal — shows customer data and actions
 */
function CustomerViewModal({
  open,
  onClose,
  customer,
  onEdit,
  onDelete,
  theme,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? customer.customerName || "Customer" : "Customer"}
      theme={theme}
    >
      {!customer ? (
        <div style={{ color: theme.subText }}>No customer selected.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={styles.avatar(theme)}>
              {String(customer.customerName || "U")
                .slice(0, 1)
                .toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: theme.text }}>
                {customer.customerName || "—"}
              </div>
              <div style={{ color: theme.subText }}>
                {customer.primaryMobile || "—"} • {customer.city || "—"}
              </div>
            </div>
          </div>

          <div style={styles.kvGrid}>
            <KV label="PAN" value={customer.panNumber || "—"} theme={theme} />
            <KV
              label="KYC Status"
              value={customer.kycStatus || "—"}
              theme={theme}
            />
            <KV
              label="Type"
              value={customer.customerType || "—"}
              theme={theme}
            />
            <KV
              label="Occupation"
              value={customer.occupationType || "—"}
              theme={theme}
            />
            <KV
              label="Company"
              value={customer.companyName || "—"}
              theme={theme}
            />
            <KV label="Bank" value={customer.bankName || "—"} theme={theme} />
            <KV
              label="Account Type"
              value={customer.accountType || "—"}
              theme={theme}
            />
            <KV
              label="Created"
              value={formatDate(customer.createdOn)}
              theme={theme}
            />
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => onEdit(customer)}
              style={styles.btnPlain(theme)}
            >
              Edit
            </button>
            <button onClick={() => onDelete(customer)} style={styles.btnDanger}>
              Delete
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function KV({ label, value, theme }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, color: theme.subText }}>{label}</div>
      <div style={{ color: theme.text }}>{value}</div>
    </div>
  );
}

/* ----------------- Main Dashboard ----------------- */

export default function CustomerDashboard() {
  const navigate = useNavigate();

  // theme
  const [mode, setMode] = useState(
    () => localStorage.getItem("snow-mode") || "light",
  );
  const theme = THEMES[mode] || THEMES.light;

  // data
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  // UI
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // table state
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [sortField, setSortField] = useState("customerName");
  const [sortDir, setSortDir] = useState("asc"); // asc | desc

  // load customers
  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/customers`);
      const text = await res.text();
      let data = [];
      try {
        const parsed = JSON.parse(text);
        data = Array.isArray(parsed?.data) ? parsed.data : parsed;
      } catch (e) {
        // fallback: try to parse as line separated JSON or empty
        console.error("Could not parse /api/customers response as JSON:", e);
      }
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load customers error", err);
      alert("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  // derived: filtered + sorted
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = customers.slice();

    if (q) {
      list = list.filter((c) =>
        [c.customerName, c.primaryMobile, c.city, c.panNumber, c.companyName]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }

    // sort
    list.sort((a, b) => {
      const A = String(a[sortField] || "").toLowerCase();
      const B = String(b[sortField] || "").toLowerCase();
      if (A < B) return sortDir === "asc" ? -1 : 1;
      if (A > B) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [customers, search, sortField, sortDir]);

  // pagination
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  // stats
  const stats = useMemo(() => {
    return {
      total: customers.length,
      completed: customers.filter((c) => c.kycStatus === "Completed").length,
      pending: customers.filter((c) => c.kycStatus === "Pending Docs").length,
      repeat: customers.filter(
        (c) => String(c.customerType).toLowerCase() === "repeat",
      ).length,
    };
  }, [customers]);

  const openView = (c) => {
    setSelected(c);
    setViewOpen(true);
  };

  const closeView = () => {
    setSelected(null);
    setViewOpen(false);
  };

  const confirmDelete = (c) => {
    setToDelete(c);
    setConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!toDelete) return;
    try {
      setLoading(true);
      const id = toDelete._id || toDelete.id;
      const res = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || "Delete failed");
      }
      // refresh
      await loadCustomers();
      setConfirmOpen(false);
      setToDelete(null);
      // if modal open for same customer, close it
      if (selected && (selected._id === id || selected.id === id)) {
        closeView();
      }
    } catch (err) {
      console.error("Delete error", err);
      alert("Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    const next = mode === "light" ? "dark" : "light";
    setMode(next);
    localStorage.setItem("snow-mode", next);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  return (
    <div
      style={{
        background: theme.page,
        minHeight: "100vh",
        padding: 24,
        transition: "background .2s linear",
      }}
    >
      {/* Header card */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: theme.text }}>
                Customers
              </div>
              <div style={{ fontSize: 13, color: theme.subText }}>
                {pageData.length} shown • {stats.total} total
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={toggleMode}
              style={styles.smallBtn(theme)}
              aria-label="Toggle theme"
            >
              {mode === "light" ? "🌙" : "☀️"}
            </button>
            <button
              onClick={() => loadCustomers()}
              style={styles.smallBtn(theme)}
            >
              ⟳ Refresh
            </button>
            <button
              onClick={() => navigate("/customers/new")}
              style={styles.primaryBtn(theme)}
            >
              ＋ New Customer
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          marginBottom: 20,
        }}
      >
        <StatCard label="Total" value={stats.total} theme={theme} />
        <StatCard label="KYC Completed" value={stats.completed} theme={theme} />
        <StatCard label="Pending Docs" value={stats.pending} theme={theme} />
        <StatCard label="Repeat Customers" value={stats.repeat} theme={theme} />
      </div>

      {/* Search & Table card */}
      <div
        style={{
          background: theme.card,
          borderRadius: 16,
          padding: 16,
          boxShadow: theme.shadow,
          border: `1px solid ${theme.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, mobile, city, PAN..."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${theme.border}`,
                background: theme.cardSoft,
                color: theme.text,
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                color: theme.subText,
                fontSize: 13,
                alignSelf: "center",
              }}
            >
              Tip: Use PAN / mobile for fastest search
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
            }}
          >
            <thead>
              <tr>
                <th style={thStyle(theme, 300)}>
                  <button
                    onClick={() => handleSort("customerName")}
                    style={styles.headerButton(theme)}
                  >
                    Customer{" "}
                    {sortField === "customerName"
                      ? sortDir === "asc"
                        ? "▲"
                        : "▼"
                      : ""}
                  </button>
                </th>
                <th style={thStyle(theme, 150)}>
                  <button
                    onClick={() => handleSort("primaryMobile")}
                    style={styles.headerButton(theme)}
                  >
                    Mobile{" "}
                    {sortField === "primaryMobile"
                      ? sortDir === "asc"
                        ? "▲"
                        : "▼"
                      : ""}
                  </button>
                </th>
                <th style={thStyle(theme, 150)}>
                  <button
                    onClick={() => handleSort("city")}
                    style={styles.headerButton(theme)}
                  >
                    City{" "}
                    {sortField === "city"
                      ? sortDir === "asc"
                        ? "▲"
                        : "▼"
                      : ""}
                  </button>
                </th>
                <th style={thStyle(theme, 140)}>
                  <button
                    onClick={() => handleSort("kycStatus")}
                    style={styles.headerButton(theme)}
                  >
                    KYC{" "}
                    {sortField === "kycStatus"
                      ? sortDir === "asc"
                        ? "▲"
                        : "▼"
                      : ""}
                  </button>
                </th>
                <th style={thStyle(theme, 180)}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      padding: 20,
                      textAlign: "center",
                      color: theme.subText,
                    }}
                  >
                    Loading...
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      padding: 20,
                      textAlign: "center",
                      color: theme.subText,
                    }}
                  >
                    No customers found.
                  </td>
                </tr>
              ) : (
                pageData.map((c) => (
                  <tr
                    key={c._id || c.id}
                    style={{ borderTop: `1px solid ${theme.border}` }}
                  >
                    <td style={tdStyle(theme)}>
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                        }}
                      >
                        <div style={avatarStyle(c, theme)}>
                          {String(c.customerName || "U")
                            .slice(0, 1)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: theme.text }}>
                            {c.customerName || "—"}
                          </div>
                          <div style={{ fontSize: 12, color: theme.subText }}>
                            {c.companyName || ""}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={tdStyle(theme)}>{c.primaryMobile || "—"}</td>
                    <td style={tdStyle(theme)}>{c.city || "—"}</td>
                    <td style={tdStyle(theme)}>
                      <span
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: badgeBg(c.kycStatus, theme),
                          color: badgeColor(c.kycStatus, theme),
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        {c.kycStatus || "—"}
                      </span>
                    </td>

                    <td style={tdStyle(theme)}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          style={styles.actionBtn(theme)}
                          onClick={() => openView(c)}
                        >
                          View
                        </button>
                        <button
                          style={styles.actionPrimary(theme)}
                          onClick={() =>
                            navigate(`/customers/edit/${c._id || c.id}`)
                          }
                        >
                          Edit
                        </button>
                        <button
                          style={styles.actionDanger}
                          onClick={() => confirmDelete(c)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* pagination controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12,
          }}
        >
          <div style={{ color: theme.subText, fontSize: 13 }}>
            Showing {(page - 1) * pageSize + 1} -{" "}
            {Math.min(page * pageSize, total)} of {total}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => setPage(1)}
              style={styles.smallBtn(theme)}
              disabled={page === 1}
            >
              {"<<"}
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={styles.smallBtn(theme)}
              disabled={page === 1}
            >
              {"<"}
            </button>
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: `1px solid ${theme.border}`,
                color: theme.text,
              }}
            >
              {page} / {totalPages}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={styles.smallBtn(theme)}
              disabled={page === totalPages}
            >
              {">"}
            </button>
            <button
              onClick={() => setPage(totalPages)}
              style={styles.smallBtn(theme)}
              disabled={page === totalPages}
            >
              {">>"}
            </button>
          </div>
        </div>
      </div>

      {/* view modal */}
      <CustomerViewModal
        open={viewOpen}
        onClose={closeView}
        customer={selected}
        onEdit={(c) => {
          navigate(`/customers/edit/${c._id || c.id}`);
          closeView();
        }}
        onDelete={(c) => {
          confirmDelete(c);
          closeView();
        }}
        theme={theme}
      />

      {/* confirm delete dialog */}
      <ConfirmDeleteDialog
        open={confirmOpen}
        onCancel={() => {
          setConfirmOpen(false);
          setToDelete(null);
        }}
        onConfirm={doDelete}
        message={`Are you sure you want to delete ${toDelete?.customerName || "this customer"}? This action cannot be undone.`}
        theme={theme}
      />
    </div>
  );
}

/* ----------------- Small presentational components ----------------- */

function StatCard({ label, value, theme }) {
  return (
    <div
      style={{
        background: theme.cardSoft,
        borderRadius: 12,
        padding: 16,
        border: `1px solid ${theme.border}`,
        boxShadow: theme.shadow,
      }}
    >
      <div style={{ fontSize: 12, color: theme.subText }}>{label}</div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: theme.text,
          marginTop: 8,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ----------------- Helpers: styles & colors ----------------- */

const thStyle = (theme, minWidth = 120) => ({
  textAlign: "left",
  padding: "12px 12px",
  fontSize: 13,
  color: theme.subText,
  minWidth,
  background: "transparent",
});

const tdStyle = (theme) => ({
  padding: "12px",
  verticalAlign: "middle",
  color: theme.text,
  fontSize: 14,
});

const avatarStyle = (c, theme) => ({
  width: 40,
  height: 40,
  borderRadius: 10,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: avatarColor(c, theme),
  color: "#fff",
  fontWeight: 700,
});

const avatarColor = (c, theme) => {
  // lightweight deterministic color
  const seed = String(c.customerName || "").charCodeAt(0) || 80;
  const hues = [theme.accent, "#7c3aed", "#06b6d4", "#ef4444", "#f59e0b"];
  return hues[seed % hues.length];
};

const badgeBg = (kyc, theme) => {
  if (!kyc) return "transparent";
  if (kyc === "Completed")
    return theme.name === "dark"
      ? "rgba(16,185,129,0.12)"
      : "rgba(245,255,236,1)";
  if (kyc === "In Progress")
    return theme.name === "dark"
      ? "rgba(59,130,246,0.08)"
      : "rgba(235,248,255,1)";
  return theme.name === "dark"
    ? "rgba(250,204,21,0.08)"
    : "rgba(255,250,235,1)";
};

const badgeColor = (kyc, theme) => {
  if (!kyc) return theme.text;
  if (kyc === "Completed") return theme.name === "dark" ? "#34d399" : "#096a2d";
  if (kyc === "In Progress")
    return theme.name === "dark" ? "#60a5fa" : "#055d8c";
  return theme.name === "dark" ? "#f59e0b" : "#a16207";
};

/* ----------------- Inline styles ----------------- */

const styles = {
  smallBtn: (theme) => ({
    border: `1px solid ${theme.border}`,
    background: "transparent",
    color: theme.text,
    padding: "8px 10px",
    borderRadius: 8,
    cursor: "pointer",
  }),
  primaryBtn: (theme) => ({
    border: "none",
    background: theme.accent,
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
  }),
  actionBtn: (theme) => ({
    border: `1px solid ${theme.border}`,
    background: "transparent",
    color: theme.text,
    padding: "6px 8px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
  }),
  actionPrimary: (theme) => ({
    background: theme.accent,
    color: "#fff",
    padding: "6px 8px",
    borderRadius: 8,
    cursor: "pointer",
    border: "none",
    fontSize: 13,
  }),
  actionDanger: {
    background: "transparent",
    border: "1px solid rgba(255,80,80,0.14)",
    color: "#ef4444",
    padding: "6px 8px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
  },
  btnPlain: (theme) => ({
    background: "transparent",
    border: `1px solid ${theme.border}`,
    color: theme.text,
    padding: "8px 10px",
    borderRadius: 8,
    cursor: "pointer",
  }),
  btnDanger: {
    background: "#ff4d4f",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  },
  iconButton: (theme) => ({
    background: "transparent",
    border: "none",
    color: theme.subText,
    cursor: "pointer",
    fontSize: 16,
  }),
  modalOverlay: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(2,6,23,0.4)",
    zIndex: 9999,
    padding: 20,
  },
  modalCard: {
    width: "min(920px, 96%)",
    borderRadius: 12,
    padding: 18,
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  avatar: (theme) => ({
    width: 56,
    height: 56,
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: theme.accent,
    color: "#fff",
    fontWeight: 800,
    fontSize: 20,
  }),
  kvGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
    gap: 12,
  },
  headerButton: (theme) => ({
    background: "transparent",
    border: "none",
    padding: 0,
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    color: theme.subText,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  }),
};

/* ----------------- Header button style helper ----------------- */

styles.smallBtn = (theme) => ({
  border: `1px solid ${theme.border}`,
  background: "transparent",
  color: theme.text,
  padding: "8px 10px",
  borderRadius: 8,
  cursor: "pointer",
});

/* ----------------- Header button used earlier (redeclare for clarity) ----------------- */

styles.btnPlain = (theme) => ({
  background: "transparent",
  border: `1px solid ${theme.border}`,
  color: theme.text,
  padding: "8px 10px",
  borderRadius: 8,
  cursor: "pointer",
});

styles.actionBtn = (theme) => ({
  border: `1px solid ${theme.border}`,
  background: "transparent",
  color: theme.text,
  padding: "6px 8px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
});

/* ----------------- Done ----------------- */
