import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Input, message, Spin, Card, Row, Col, Divider, Tag } from "antd";
import { ArrowLeft } from "lucide-react";
import { showroomsApi } from "../../api/showrooms";

/**
 * Detailed Showroom View Page
 * Displays all showroom fields without customer/loan data
 */
const DetailedShowroomViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showroom, setShowroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    businessName: "",
    contactPerson: "",
    mobile: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gstNumber: "",
    panNumber: "",
    brands: [],
    bankName: "",
    ifscCode: "",
    accountHolderName: "",
    commissionRate: 0,
    status: "Active",
  });

  const parseShowroomDetailResponse = (res) => {
    if (res?.data && res.data.data) return res.data.data;
    if (res?.data && !Array.isArray(res.data)) return res.data;
    return null;
  };
  const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "—");

  useEffect(() => {
    loadShowroom();
  }, [id]);

  const loadShowroom = async () => {
    setLoading(true);
    try {
      const res = await showroomsApi.getById(id);
      const showroom = parseShowroomDetailResponse(res);
      if (showroom) {
        setShowroom(showroom);
        setFormData(showroom);
      } else {
        message.error("Showroom not found");
        navigate("/superadmin/showrooms");
      }
    } catch (error) {
      console.error("Error loading showroom:", error);
      message.error("Failed to load showroom details");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.address) {
      message.error("Showroom name and address are required");
      return;
    }

    setSaving(true);
    try {
      const res = await showroomsApi.update(showroom._id, formData);
      const updated = parseShowroomDetailResponse(res) || formData;
      message.success("Showroom updated successfully");
      setShowroom(updated);
      setFormData(updated);
      setEditing(false);
    } catch (error) {
      console.error("Error saving showroom:", error);
      message.error(error?.message || "Failed to save showroom");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Spin className="flex items-center justify-center py-20" />;
  }

  if (!showroom) {
    return null;
  }
  const totalCommissionReceivable = Number(showroom.totalCommissionReceivable || 0);
  const totalCommissionPaid = Number(showroom.totalCommissionPaid || 0);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center gap-3">
        <Button type="text" icon={<ArrowLeft size={20} />} onClick={() => navigate(-1)} />
        <h2 className="text-2xl font-black text-foreground">Showroom Profile</h2>
      </div>

      <Card className="rounded-2xl border border-border shadow-sm">
        <div className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-2xl font-black text-foreground">{showroom.name}</h3>
              <p className="mt-1 text-xs font-semibold tracking-wide text-muted-foreground">
                Showroom ID: {showroom.showroomId || "—"}
              </p>
            </div>
            {!editing && (
              <Button type="primary" onClick={() => setEditing(true)}>
                Edit Profile
              </Button>
            )}
            {editing && (
              <div className="flex gap-2">
                <Button type="primary" loading={saving} onClick={handleSave}>
                  Save Changes
                </Button>
                <Button onClick={() => { setEditing(false); setFormData(showroom); }}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">Status</p>
              <Tag color={showroom.status === "Active" ? "green" : "red"} className="mt-1">
                {showroom.status}
              </Tag>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="text-sm font-semibold text-foreground">
                ₹{(showroom.outstandingCommission || 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">Receivable</p>
              <p className="text-sm font-semibold text-foreground">₹{totalCommissionReceivable.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-sm font-semibold text-foreground">₹{totalCommissionPaid.toLocaleString()}</p>
            </div>
          </div>

          <Divider className="my-1" />

          <Row gutter={[16, 16]}>
            <Col span={24}>
              <h4 className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                Basic Information
              </h4>
            </Col>
            <Col xs={24} sm={12}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Showroom Name</label>
              {editing ? (
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{formData.name || "—"}</div>
              )}
            </Col>
            <Col xs={24} sm={12}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Business Name</label>
              {editing ? (
                <Input value={formData.businessName || ""} onChange={(e) => setFormData({...formData, businessName: e.target.value})} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{formData.businessName || "—"}</div>
              )}
            </Col>
            <Col xs={24} sm={12}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Contact Person</label>
              {editing ? (
                <Input value={formData.contactPerson || ""} onChange={(e) => setFormData({...formData, contactPerson: e.target.value})} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{formData.contactPerson || "—"}</div>
              )}
            </Col>
            <Col xs={24} sm={12}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Mobile</label>
              {editing ? (
                <Input value={formData.mobile || ""} onChange={(e) => setFormData({...formData, mobile: e.target.value})} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{formData.mobile || "—"}</div>
              )}
            </Col>
            <Col xs={24} sm={12}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Email</label>
              {editing ? (
                <Input value={formData.email || ""} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{formData.email || "—"}</div>
              )}
            </Col>

            <Col span={24} className="pt-2"><h4 className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">Address</h4></Col>
            <Col xs={24}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Address</label>
              {editing ? (
                <Input value={formData.address || ""} onChange={(e) => setFormData({...formData, address: e.target.value})} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{formData.address || "—"}</div>
              )}
            </Col>
            <Col xs={24} sm={8}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">City</label>
              {editing ? (
                <Input value={formData.city || ""} onChange={(e) => setFormData({...formData, city: e.target.value})} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{formData.city || "—"}</div>
              )}
            </Col>
            <Col xs={24} sm={8}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">State</label>
              {editing ? (
                <Input value={formData.state || ""} onChange={(e) => setFormData({...formData, state: e.target.value})} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{formData.state || "—"}</div>
              )}
            </Col>
            <Col xs={24} sm={8}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Pincode</label>
              {editing ? (
                <Input value={formData.pincode || ""} onChange={(e) => setFormData({...formData, pincode: e.target.value})} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{formData.pincode || "—"}</div>
              )}
            </Col>

            <Col span={24} className="pt-2"><h4 className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">Business Details</h4></Col>
            <Col xs={24} sm={12}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">GST Number</label>
              {editing ? (
                <Input value={formData.gstNumber || ""} onChange={(e) => setFormData({...formData, gstNumber: e.target.value})} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 font-mono text-sm">{formData.gstNumber || "—"}</div>
              )}
            </Col>
            <Col xs={24} sm={12}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">PAN Number</label>
              {editing ? (
                <Input value={formData.panNumber || ""} onChange={(e) => setFormData({...formData, panNumber: e.target.value})} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 font-mono text-sm">{formData.panNumber || "—"}</div>
              )}
            </Col>
            <Col xs={24}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Brands</label>
              {editing ? (
                <Input 
                  value={(formData.brands || []).join(", ")}
                  onChange={(e) => setFormData({...formData, brands: e.target.value.split(",").map(b => b.trim())})}
                  placeholder="Comma-separated brands"
                />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{(formData.brands || []).length > 0 ? formData.brands.join(", ") : "—"}</div>
              )}
            </Col>

            <Col span={24} className="pt-2"><h4 className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">Banking Details</h4></Col>
            <Col xs={24} sm={12}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Bank Name</label>
              {editing ? (
                <Input value={formData.bankName || ""} onChange={(e) => setFormData({...formData, bankName: e.target.value})} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{formData.bankName || "—"}</div>
              )}
            </Col>
            <Col xs={24} sm={12}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">IFSC Code</label>
              {editing ? (
                <Input value={formData.ifscCode || ""} onChange={(e) => setFormData({...formData, ifscCode: e.target.value.toUpperCase()})} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 font-mono text-sm">{formData.ifscCode || "—"}</div>
              )}
            </Col>
            <Col xs={24}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Account Holder Name</label>
              {editing ? (
                <Input value={formData.accountHolderName || ""} onChange={(e) => setFormData({...formData, accountHolderName: e.target.value})} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{formData.accountHolderName || "—"}</div>
              )}
            </Col>

            <Col span={24} className="pt-2"><h4 className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">Commission</h4></Col>
            <Col xs={24} sm={12}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Commission Rate (%)</label>
              {editing ? (
                <Input
                  type="number"
                  value={formData.commissionRate || 0}
                  onChange={(e) => setFormData({...formData, commissionRate: parseFloat(e.target.value) || 0})}
                />
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{formData.commissionRate || 0}%</div>
              )}
            </Col>
            <Col xs={24} sm={12}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Outstanding Commission</label>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                ₹{(showroom.outstandingCommission || 0).toLocaleString()}
              </div>
            </Col>

            <Col span={24} className="pt-2"><h4 className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">Metadata</h4></Col>
            <Col xs={24} sm={12}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Created</label>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{formatDate(showroom.createdAt)}</div>
            </Col>
            <Col xs={24} sm={12}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Updated</label>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{formatDate(showroom.updatedAt)}</div>
            </Col>
          </Row>
        </div>
      </Card>
    </div>
  );
};

export default DetailedShowroomViewPage;
