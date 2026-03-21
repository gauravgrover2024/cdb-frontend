import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button, Input, message, Spin, Card, Row, Col, Divider, Tag } from "antd";
import { ArrowLeft } from "lucide-react";
import { banksApi } from "../../api/banks";
import BankLogoBadge from "../../components/banks/BankLogoBadge";

const IFSC_BANK_CODE_MAP = {
  HDFC: "HDFC Bank",
  ICIC: "ICICI Bank",
  SBIN: "State Bank of India",
  UTIB: "Axis Bank",
  KKBK: "Kotak Mahindra Bank",
  FDRL: "Federal Bank",
  PUNB: "Punjab National Bank",
  CNRB: "Canara Bank",
  IDIB: "Indian Bank",
  BARB: "Bank of Baroda",
  BKID: "Bank of India",
  UBIN: "Union Bank of India",
  INDB: "IndusInd Bank",
  YESB: "Yes Bank",
  IDFB: "IDFC First Bank",
  MAHB: "Bank of Maharashtra",
};

const inferBankNameFromIfsc = (ifsc) => {
  const normalized = String(ifsc || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 11);
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(normalized)) return "";
  return IFSC_BANK_CODE_MAP[normalized.slice(0, 4)] || "";
};

const getDisplayBankName = (bank) =>
  bank?.name || inferBankNameFromIfsc(bank?.ifsc) || "Unknown Bank";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
};

/**
 * Detailed Bank View Page
 * Displays all bank directory fields with edit capability
 */
const DetailedBankViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fallbackBankFromList = location?.state?.bank || null;
  const [bank, setBank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    ifsc: "",
    micr: "",
    branch: "",
    address: "",
    city: "",
    state: "",
    district: "",
    contact: "",
    active: true,
  });

  useEffect(() => {
    loadBank();
  }, [id]);

  const loadBank = async () => {
    setLoading(true);
    try {
      const res = await banksApi.getAll({
        id,
        limit: 1,
        fields: "detail",
      });
      const bank = Array.isArray(res?.data) ? res.data[0] : null;
      if (bank) {
        setBank(bank);
        setFormData(bank);
      } else {
        if (fallbackBankFromList) {
          setBank(fallbackBankFromList);
          setFormData(fallbackBankFromList);
        } else {
          message.error("Bank not found");
          navigate("/superadmin/banks");
        }
      }
    } catch (error) {
      console.error("Error loading bank:", error);
      if (fallbackBankFromList) {
        setBank(fallbackBankFromList);
        setFormData(fallbackBankFromList);
      } else {
        message.error("Failed to load bank details");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.ifsc) {
      message.error("Bank name and IFSC are required");
      return;
    }

    setSaving(true);
    try {
      await banksApi.update(bank._id, formData);
      message.success("Bank updated successfully");
      setBank(formData);
      setEditing(false);
    } catch (error) {
      console.error("Error saving bank:", error);
      message.error(error?.message || "Failed to save bank");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Spin className="flex items-center justify-center py-20" />;
  }

  if (!bank) {
    return null;
  }
  const displayName = getDisplayBankName(formData);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center gap-3">
        <Button type="text" icon={<ArrowLeft size={20} />} onClick={() => navigate(-1)} />
        <h2 className="text-2xl font-black text-foreground">Bank Profile</h2>
      </div>

      <Card className="rounded-2xl border border-border shadow-sm">
        <div className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <BankLogoBadge bankName={displayName} size={52} />
              <div>
                <h3 className="text-2xl font-black text-foreground">{displayName}</h3>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground">
                  IFSC: {formData.ifsc || "Unavailable"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {!editing ? (
                <Button type="primary" onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button type="primary" loading={saving} onClick={handleSave}>
                    Save
                  </Button>
                  <Button onClick={() => { setEditing(false); setFormData(bank); }}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/25 px-4 py-3">
              <p className="text-xs text-muted-foreground">Current Status</p>
              <Tag color={formData.active ? "green" : "red"} className="mt-1">
                {formData.active ? "Active" : "Inactive"}
              </Tag>
            </div>
            <div className="rounded-xl border border-border bg-muted/25 px-4 py-3">
              <p className="text-xs text-muted-foreground">Last Verified</p>
              <p className="text-sm font-semibold text-foreground">{formatDate(bank.lastVerifiedAt)}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/25 px-4 py-3">
              <p className="text-xs text-muted-foreground">Created On</p>
              <p className="text-sm font-semibold text-foreground">{formatDate(bank.createdAt)}</p>
            </div>
          </div>

          <Divider className="my-1" />

          <Row gutter={[16, 16]}>
            <Col span={24}>
              <h4 className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                Identity
              </h4>
            </Col>

            <Col xs={24} md={12}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Bank Name</label>
              {editing ? (
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm font-semibold">
                  {displayName}
                </div>
              )}
            </Col>
            <Col xs={24} md={12}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">IFSC Code</label>
              {editing ? (
                <Input
                  value={formData.ifsc}
                  onChange={(e) => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
                />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 font-mono text-sm">
                  {formData.ifsc || "—"}
                </div>
              )}
            </Col>
            <Col xs={24} md={12}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">MICR Code</label>
              {editing ? (
                <Input value={formData.micr || ""} onChange={(e) => setFormData({ ...formData, micr: e.target.value })} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 font-mono text-sm">
                  {formData.micr || "—"}
                </div>
              )}
            </Col>
            <Col xs={24} md={12}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Status</label>
              {editing ? (
                <select
                  value={formData.active ? "Active" : "Inactive"}
                  onChange={(e) => setFormData({ ...formData, active: e.target.value === "Active" })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                  {formData.active ? "Active" : "Inactive"}
                </div>
              )}
            </Col>

            <Col span={24} className="pt-2">
              <h4 className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                Branch & Location
              </h4>
            </Col>
            <Col xs={24} md={12}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Branch</label>
              {editing ? (
                <Input value={formData.branch || ""} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{formData.branch || "—"}</div>
              )}
            </Col>
            <Col xs={24} md={12}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Address</label>
              {editing ? (
                <Input value={formData.address || ""} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{formData.address || "—"}</div>
              )}
            </Col>
            <Col xs={24} md={8}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">City</label>
              {editing ? (
                <Input value={formData.city || ""} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{formData.city || "—"}</div>
              )}
            </Col>
            <Col xs={24} md={8}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">State</label>
              {editing ? (
                <Input value={formData.state || ""} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{formData.state || "—"}</div>
              )}
            </Col>
            <Col xs={24} md={8}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">District</label>
              {editing ? (
                <Input value={formData.district || ""} onChange={(e) => setFormData({ ...formData, district: e.target.value })} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{formData.district || "—"}</div>
              )}
            </Col>

            <Col span={24} className="pt-2">
              <h4 className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                Contact
              </h4>
            </Col>
            <Col xs={24}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Contact Number</label>
              {editing ? (
                <Input value={formData.contact || ""} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{formData.contact || "—"}</div>
              )}
            </Col>

            <Col span={24} className="pt-2">
              <h4 className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                Metadata
              </h4>
            </Col>
            <Col xs={24} md={6}>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Created</p>
                <p className="text-sm font-semibold">{formatDate(bank.createdAt)}</p>
              </div>
            </Col>
            <Col xs={24} md={6}>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Updated</p>
                <p className="text-sm font-semibold">{formatDate(bank.updatedAt)}</p>
              </div>
            </Col>
            <Col xs={24} md={6}>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Last Verified</p>
                <p className="text-sm font-semibold">{formatDate(bank.lastVerifiedAt)}</p>
              </div>
            </Col>
            <Col xs={24} md={6}>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Record ID</p>
                <p className="truncate font-mono text-sm">{String(bank._id || "—")}</p>
              </div>
            </Col>
          </Row>
        </div>
      </Card>
    </div>
  );
};

export default DetailedBankViewPage;
