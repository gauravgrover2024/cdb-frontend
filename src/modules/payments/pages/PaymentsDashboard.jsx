import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Input,
  Row,
  Col,
  Progress,
  Space,
  Tooltip,
  Badge,
} from "antd";
import { useNavigate } from "react-router-dom";
import {
  SearchOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DollarOutlined,
  WalletOutlined,
} from "@ant-design/icons";

const safeText = (v) => (v === undefined || v === null ? "" : String(v));

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const money = (n) => `₹${asInt(n).toLocaleString("en-IN")}`;

const PaymentsDashboard = () => {
  const navigate = useNavigate();

  const [loans, setLoans] = useState([]);
  const [savedPayments, setSavedPayments] = useState([]);
  const [savedDOs, setSavedDOs] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const loadData = () => {
    const savedLoans = JSON.parse(localStorage.getItem("savedLoans") || "[]");
    const payments = JSON.parse(localStorage.getItem("savedPayments") || "[]");
    const dos = JSON.parse(localStorage.getItem("savedDOs") || "[]");

    setLoans(savedLoans);
    setSavedPayments(payments);
    setSavedDOs(dos);
  };

  useEffect(() => {
    loadData();
  }, []);

  const paymentMap = useMemo(() => {
    const map = {};
    (savedPayments || []).forEach((p) => {
      if (p?.loanId) map[p.loanId] = p;
    });
    return map;
  }, [savedPayments]);

  const doMap = useMemo(() => {
    const map = {};
    (savedDOs || []).forEach((d) => {
      if (d?.loanId) map[d.loanId] = d;
      if (d?.do_loanId) map[d.do_loanId] = d;
    });
    return map;
  }, [savedDOs]);

  const enrichedLoans = useMemo(() => {
    return (loans || []).map((loan) => {
      const loanId = loan?.loanId;
      const doRec = doMap[loanId];
      const payRec = paymentMap[loanId];

      const netDO = asInt(doRec?.do_netOnRoadVehicleCost || 0);

      const showroomPaid =
        asInt(payRec?.entryTotals?.paymentAmountAutocredits || 0) +
        asInt(payRec?.entryTotals?.paymentAmountCustomer || 0) +
        asInt(payRec?.entryTotals?.paymentAmountLoan || 0);

      const showroomOutstanding = Math.max(0, netDO - showroomPaid);

      const autocreditsReceived = asInt(
        payRec?.autocreditsTotals?.receiptAmountTotal || 0,
      );

      const showroomVerified = !!payRec?.isVerified;
      const autocreditsVerified = !!payRec?.isAutocreditsVerified;

      const bothVerified = showroomVerified && autocreditsVerified;
      const hasPayment = !!payRec;

      const status = bothVerified
        ? "verified"
        : hasPayment
          ? showroomOutstanding > 0
            ? "pending"
            : "partial"
          : "draft";

      return {
        ...loan,
        doRec,
        payRec,
        netDO,
        showroomPaid,
        showroomOutstanding,
        autocreditsReceived,
        showroomVerified,
        autocreditsVerified,
        bothVerified,
        hasPayment,
        status,
      };
    });
  }, [loans, doMap, paymentMap]);

  const searchFilteredLoans = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return enrichedLoans;

    return enrichedLoans.filter((l) => {
      const vehicle = `${safeText(l.vehicleMake)} ${safeText(
        l.vehicleModel,
      )} ${safeText(l.vehicleVariant)}`.trim();

      return (
        safeText(l.loanId).toLowerCase().includes(s) ||
        safeText(l.customerName).toLowerCase().includes(s) ||
        vehicle.toLowerCase().includes(s) ||
        safeText(l.doRec?.do_refNo).toLowerCase().includes(s)
      );
    });
  }, [enrichedLoans, search]);

  const filteredLoans = useMemo(() => {
    if (filterStatus === "all") return searchFilteredLoans;

    return searchFilteredLoans.filter((l) => {
      if (filterStatus === "verified") return l.bothVerified;
      if (filterStatus === "pending")
        return l.hasPayment && l.showroomOutstanding > 0;
      if (filterStatus === "draft") return !l.hasPayment;
      return true;
    });
  }, [searchFilteredLoans, filterStatus]);

  const analytics = useMemo(() => {
    let totalFiles = enrichedLoans.length;
    let totalVerified = 0;
    let totalPending = 0;
    let totalDraft = 0;

    let totalShowroomPayable = 0;
    let totalShowroomPaid = 0;
    let totalShowroomOutstanding = 0;

    let totalAutocreditsReceived = 0;

    enrichedLoans.forEach((loan) => {
      if (loan.bothVerified) totalVerified++;
      else if (loan.hasPayment && loan.showroomOutstanding > 0) totalPending++;
      else if (!loan.hasPayment) totalDraft++;

      totalShowroomPayable += loan.netDO;
      totalShowroomPaid += loan.showroomPaid;
      totalShowroomOutstanding += loan.showroomOutstanding;

      totalAutocreditsReceived += loan.autocreditsReceived;
    });

    const verifiedPercentage =
      totalFiles > 0 ? (totalVerified / totalFiles) * 100 : 0;
    const collectionRate =
      totalShowroomPayable > 0
        ? (totalShowroomPaid / totalShowroomPayable) * 100
        : 0;

    return {
      totalFiles,
      totalVerified,
      totalPending,
      totalDraft,
      totalShowroomPayable,
      totalShowroomPaid,
      totalShowroomOutstanding,
      totalAutocreditsReceived,
      verifiedPercentage,
      collectionRate,
    };
  }, [enrichedLoans]);

  const columns = [
    {
      title: "Status",
      key: "status",
      width: 100,
      fixed: "left",
      render: (_, loan) => {
        if (loan.bothVerified) {
          return (
            <Tooltip title="Both accounts verified">
              <Badge status="success" />
            </Tooltip>
          );
        }
        if (loan.showroomVerified) {
          return (
            <Tooltip title="Showroom verified">
              <Badge status="processing" />
            </Tooltip>
          );
        }
        if (loan.hasPayment && loan.showroomOutstanding > 0) {
          return (
            <Tooltip title="Payment pending">
              <Badge status="warning" />
            </Tooltip>
          );
        }
        return (
          <Tooltip title="Draft">
            <Badge status="default" />
          </Tooltip>
        );
      },
    },
    {
      title: "Loan / DO",
      key: "ids",
      width: 180,
      render: (_, loan) => {
        const doRef = safeText(
          loan.doRec?.do_refNo ||
            loan.doRec?.doRefNo ||
            loan.doRec?.refNo ||
            "",
        );
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#1d1d1f" }}>
              {loan.loanId}
            </div>
            {doRef && (
              <div style={{ fontSize: 11, color: "#86868b", marginTop: 2 }}>
                DO: {doRef}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Customer",
      key: "customer",
      width: 200,
      render: (_, loan) => {
        const vehicle = `${safeText(loan.vehicleMake)} ${safeText(
          loan.vehicleModel,
        )}`.trim();
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#1d1d1f" }}>
              {safeText(loan.customerName) || "—"}
            </div>
            <div style={{ fontSize: 11, color: "#86868b", marginTop: 2 }}>
              {vehicle || "—"}
            </div>
          </div>
        );
      },
    },
    {
      title: "Showroom Account",
      key: "showroom",
      width: 200,
      render: (_, loan) => {
        const progress =
          loan.netDO > 0 ? (loan.showroomPaid / loan.netDO) * 100 : 0;
        return (
          <div>
            <div style={{ marginBottom: 6 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "#86868b",
                  marginBottom: 2,
                }}
              >
                Payable: {money(loan.netDO)}
              </div>
              <Progress
                percent={Math.min(100, progress)}
                size="small"
                strokeColor={progress >= 100 ? "#34c759" : "#007aff"}
                showInfo={false}
              />
            </div>
            <div style={{ fontSize: 11, color: "#1d1d1f" }}>
              Paid: <strong>{money(loan.showroomPaid)}</strong>
            </div>
            {loan.showroomOutstanding > 0 && (
              <div style={{ fontSize: 11, color: "#ff3b30", marginTop: 2 }}>
                Due: <strong>{money(loan.showroomOutstanding)}</strong>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Autocredits Account",
      key: "autocredits",
      width: 180,
      render: (_, loan) => {
        return (
          <div>
            <div style={{ fontSize: 11, color: "#86868b", marginBottom: 2 }}>
              Receipts from Customer
            </div>
            <div style={{ fontSize: 13, color: "#1d1d1f", fontWeight: 600 }}>
              {money(loan.autocreditsReceived)}
            </div>
            <div style={{ marginTop: 6 }}>
              {loan.showroomVerified && (
                <Tag
                  color="gold"
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 6,
                    marginBottom: 4,
                  }}
                >
                  Showroom ✓
                </Tag>
              )}
              {loan.autocreditsVerified && (
                <Tag
                  color="purple"
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 6,
                  }}
                >
                  Autocredits ✓
                </Tag>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      fixed: "right",
      render: (_, loan) => {
        return (
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            {!loan.hasPayment ? (
              <Button
                type="primary"
                size="small"
                block
                icon={<PlusOutlined />}
                onClick={() => navigate(`/payments/${loan.loanId}`)}
                style={{
                  borderRadius: 8,
                  fontWeight: 600,
                  background: "#007aff",
                  borderColor: "transparent",
                }}
              >
                Create Payment
              </Button>
            ) : (
              <>
                <Button
                  size="small"
                  block
                  onClick={() => navigate(`/payments/${loan.loanId}`)}
                  style={{
                    borderRadius: 8,
                    fontWeight: 600,
                  }}
                >
                  Edit Payment
                </Button>
                <Button
                  size="small"
                  block
                  type="text"
                  onClick={() => navigate(`/payments/${loan.loanId}?view=1`)}
                  style={{
                    borderRadius: 8,
                    color: "#007aff",
                  }}
                >
                  View Details
                </Button>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  const tableData = filteredLoans.map((l) => ({
    ...l,
    key: l.loanId,
  }));

  return (
    <div style={{ background: "#f5f5f7", minHeight: "100vh", padding: "24px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#1d1d1f",
              letterSpacing: "-0.8px",
              marginBottom: 8,
            }}
          >
            Payments
          </div>
          <div style={{ fontSize: 15, color: "#86868b" }}>
            Track showroom payments, autocredits receipts, and verification
            status
          </div>
        </div>

        {/* Analytics Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {/* Total Files */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                background: "#ffffff",
                borderRadius: 16,
                border: "1px solid rgba(0, 0, 0, 0.06)",
              }}
              bodyStyle={{ padding: 20 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "#86868b",
                      marginBottom: 8,
                    }}
                  >
                    Total Files
                  </div>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 700,
                      color: "#1d1d1f",
                      letterSpacing: "-1px",
                    }}
                  >
                    {analytics.totalFiles}
                  </div>
                  <div style={{ fontSize: 11, color: "#86868b", marginTop: 4 }}>
                    {analytics.totalVerified} verified · {analytics.totalDraft}{" "}
                    draft
                  </div>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "rgba(0, 122, 255, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <DollarOutlined style={{ fontSize: 24, color: "#007aff" }} />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Progress
                  percent={analytics.verifiedPercentage}
                  strokeColor="#34c759"
                  size="small"
                  format={(percent) => `${percent.toFixed(0)}% verified`}
                />
              </div>
            </Card>
          </Col>

          {/* Showroom Outstanding */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                background: "#ffffff",
                borderRadius: 16,
                border: "1px solid rgba(0, 0, 0, 0.06)",
              }}
              bodyStyle={{ padding: 20 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "#86868b",
                      marginBottom: 8,
                    }}
                  >
                    Outstanding (Showroom)
                  </div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: "#ff3b30",
                      letterSpacing: "-0.8px",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {money(analytics.totalShowroomOutstanding)}
                  </div>
                  <div style={{ fontSize: 11, color: "#86868b", marginTop: 4 }}>
                    of {money(analytics.totalShowroomPayable)} payable
                  </div>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "rgba(255, 59, 48, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ExclamationCircleOutlined
                    style={{ fontSize: 24, color: "#ff3b30" }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Progress
                  percent={analytics.collectionRate}
                  strokeColor="#34c759"
                  size="small"
                  format={(percent) => `${percent.toFixed(0)}% collected`}
                />
              </div>
            </Card>
          </Col>

          {/* Showroom Paid */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                background: "#ffffff",
                borderRadius: 16,
                border: "1px solid rgba(0, 0, 0, 0.06)",
              }}
              bodyStyle={{ padding: 20 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "#86868b",
                      marginBottom: 8,
                    }}
                  >
                    Paid (Showroom)
                  </div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: "#34c759",
                      letterSpacing: "-0.8px",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {money(analytics.totalShowroomPaid)}
                  </div>
                  <div style={{ fontSize: 11, color: "#86868b", marginTop: 4 }}>
                    {analytics.collectionRate.toFixed(0)}% collection rate
                  </div>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "rgba(52, 199, 89, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckCircleOutlined
                    style={{ fontSize: 24, color: "#34c759" }}
                  />
                </div>
              </div>
            </Card>
          </Col>

          {/* Autocredits Received */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                background: "#ffffff",
                borderRadius: 16,
                border: "1px solid rgba(0, 0, 0, 0.06)",
              }}
              bodyStyle={{ padding: 20 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "#86868b",
                      marginBottom: 8,
                    }}
                  >
                    Received (Autocredits)
                  </div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: "#af52de",
                      letterSpacing: "-0.8px",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {money(analytics.totalAutocreditsReceived)}
                  </div>
                  <div style={{ fontSize: 11, color: "#86868b", marginTop: 4 }}>
                    from customers
                  </div>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "rgba(175, 82, 222, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <WalletOutlined style={{ fontSize: 24, color: "#af52de" }} />
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Filters & Search */}
        <Card
          style={{
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid rgba(0, 0, 0, 0.06)",
            marginBottom: 16,
          }}
          bodyStyle={{ padding: 20 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <Input
              placeholder="Search by Loan ID, Customer, Vehicle, or DO..."
              prefix={<SearchOutlined style={{ color: "#86868b" }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                maxWidth: 400,
                borderRadius: 10,
                height: 40,
              }}
            />

            <Space>
              <Button
                type={filterStatus === "all" ? "primary" : "default"}
                onClick={() => setFilterStatus("all")}
                style={{
                  borderRadius: 8,
                  fontWeight: 600,
                  ...(filterStatus === "all" && {
                    background: "#007aff",
                    borderColor: "transparent",
                  }),
                }}
              >
                All ({enrichedLoans.length})
              </Button>
              <Button
                type={filterStatus === "verified" ? "primary" : "default"}
                onClick={() => setFilterStatus("verified")}
                style={{
                  borderRadius: 8,
                  fontWeight: 600,
                  ...(filterStatus === "verified" && {
                    background: "#34c759",
                    borderColor: "transparent",
                  }),
                }}
              >
                Verified ({analytics.totalVerified})
              </Button>
              <Button
                type={filterStatus === "pending" ? "primary" : "default"}
                onClick={() => setFilterStatus("pending")}
                style={{
                  borderRadius: 8,
                  fontWeight: 600,
                  ...(filterStatus === "pending" && {
                    background: "#ff9500",
                    borderColor: "transparent",
                  }),
                }}
              >
                Pending ({analytics.totalPending})
              </Button>
              <Button
                type={filterStatus === "draft" ? "primary" : "default"}
                onClick={() => setFilterStatus("draft")}
                style={{
                  borderRadius: 8,
                  fontWeight: 600,
                  ...(filterStatus === "draft" && {
                    background: "#86868b",
                    borderColor: "transparent",
                  }),
                }}
              >
                Draft ({analytics.totalDraft})
              </Button>
            </Space>
          </div>
        </Card>

        {/* Table */}
        <Card
          style={{
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid rgba(0, 0, 0, 0.06)",
          }}
          bodyStyle={{ padding: 0 }}
        >
          <Table
            columns={columns}
            dataSource={tableData}
            scroll={{ x: 1200 }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => (
                <span style={{ color: "#86868b", fontSize: 13 }}>
                  {total} files
                </span>
              ),
            }}
            size="middle"
            style={{
              borderRadius: 16,
            }}
          />
        </Card>
      </div>
    </div>
  );
};

export default PaymentsDashboard;
