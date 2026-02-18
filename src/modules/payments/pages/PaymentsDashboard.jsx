import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Input,
  Typography,
  Tooltip,
  Row,
  Col,
} from "antd";
import { useNavigate } from "react-router-dom";
import {
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { loansApi } from "../../../api/loans";
import { deliveryOrdersApi } from "../../../api/deliveryOrders";
import { paymentsApi } from "../../../api/payments";

const { Text } = Typography;

const safeText = (v) => (v === undefined || v === null ? "" : String(v));

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const money = (n) => `₹ ${asInt(n).toLocaleString("en-IN")}`;

const PaymentsDashboard = () => {
  const navigate = useNavigate();

  const [loans, setLoans] = useState([]);
  const [savedPayments, setSavedPayments] = useState([]);
  const [savedDOs, setSavedDOs] = useState([]);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    try {
      const [loansRes, dosRes, paymentsRes] = await Promise.all([
        loansApi.getAll("?limit=10000&skip=0"),
        deliveryOrdersApi.getAll(),
        paymentsApi.getAll(),
      ]);

      setLoans(loansRes?.data || []);
      setSavedDOs(dosRes?.data || []);
      setSavedPayments(paymentsRes?.data || []);
      return;
    } catch (err) {
      const savedLoans = JSON.parse(
        localStorage.getItem("savedLoans") || "[]"
      );
      const payments = JSON.parse(
        localStorage.getItem("savedPayments") || "[]"
      );
      const dos = JSON.parse(localStorage.getItem("savedDOs") || "[]");

      setLoans(savedLoans);
      setSavedPayments(payments);
      setSavedDOs(dos);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Map payments by loanId
  const paymentMap = useMemo(() => {
    const map = {};
    (savedPayments || []).forEach((p) => {
      if (p?.loanId) map[p.loanId] = p;
    });
    return map;
  }, [savedPayments]);

  // Map DO by loanId / do_loanId
  const doMap = useMemo(() => {
    const map = {};
    (savedDOs || []).forEach((d) => {
      if (d?.loanId) map[d.loanId] = d;
      if (d?.do_loanId) map[d.do_loanId] = d;
    });
    return map;
  }, [savedDOs]);

  const filteredLoans = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return loans;

    return (loans || []).filter((l) => {
      const vehicle = `${safeText(l.vehicleMake)} ${safeText(
        l.vehicleModel
      )} ${safeText(l.vehicleVariant)}`.trim();

      return (
        safeText(l.loanId).toLowerCase().includes(s) ||
        safeText(l.customerName).toLowerCase().includes(s) ||
        vehicle.toLowerCase().includes(s) ||
        safeText(l.recordSource).toLowerCase().includes(s) ||
        safeText(l.sourceName).toLowerCase().includes(s)
      );
    });
  }, [loans, search]);

  // -------------
  // Top summary
  // -------------
  const totals = useMemo(() => {
    let totalPaidToShowroom = 0;
    let totalReceivedByAutocredits = 0;

    (savedPayments || []).forEach((p) => {
      // showroom payments
      totalPaidToShowroom +=
        asInt(p?.entryTotals?.paymentAmountLoan || 0) +
        asInt(p?.entryTotals?.paymentAmountAutocredits || 0) +
        asInt(p?.entryTotals?.paymentAmountCustomer || 0);

      // autocredits receipts
      totalReceivedByAutocredits += asInt(
        p?.autocreditsTotals?.receiptAmountTotal || 0
      );
    });

    let totalOutstandingToShowroom = 0;

    (loans || []).forEach((loan) => {
      const loanId = loan?.loanId;
      const doRec = doMap[loanId];
      const payRec = paymentMap[loanId];

      const netDo = asInt(doRec?.do_netDOAmount);
      const paidToShowroom =
        asInt(payRec?.entryTotals?.paymentAmountLoan || 0) +
        asInt(payRec?.entryTotals?.paymentAmountAutocredits || 0) +
        asInt(payRec?.entryTotals?.paymentAmountCustomer || 0);

      if (netDo > 0) {
        totalOutstandingToShowroom += Math.max(0, netDo - paidToShowroom);
      }
    });

    return {
      totalPaidToShowroom,
      totalReceivedByAutocredits,
      totalOutstandingToShowroom,
    };
  }, [savedPayments, loans, doMap, paymentMap]);

  // -------------
  // Table columns
  // -------------
  const columns = [
    {
      title: "Loan / DO",
      key: "ids",
      width: 200,
      render: (_, loan) => {
        const doRec = doMap[loan.loanId];
        const doRef = safeText(
          doRec?.do_refNo ||
            doRec?.doRefNo ||
            doRec?.refNo ||
            doRec?.ref_no ||
            ""
        );
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Text strong>{loan.loanId}</Text>
            {doRef ? (
              <Text type="secondary" style={{ fontSize: 11 }}>
                DO: {doRef}
              </Text>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "Customer / Vehicle",
      key: "customerVehicle",
      width: 280,
      render: (_, loan) => {
        const vehicle = `${safeText(loan.vehicleMake)} ${safeText(
          loan.vehicleModel
        )} ${safeText(loan.vehicleVariant)}`.trim();
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Text>{safeText(loan.customerName) || "—"}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {vehicle || "—"}
            </Text>
          </div>
        );
      },
    },
    {
      title: "Type / Source",
      key: "typeSource",
      width: 170,
      render: (_, loan) => {
        const financed = safeText(loan?.isFinanced).toLowerCase() === "yes";
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div>
              {financed ? (
                <Tag color="blue">Financed</Tag>
              ) : (
                <Tag color="green">Cash</Tag>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {safeText(loan.recordSource) || "—"}
              {loan.sourceName ? ` • ${safeText(loan.sourceName)}` : ""}
            </Text>
          </div>
        );
      },
    },
    {
      title: "Showroom Account",
      key: "showroom",
      width: 260,
      render: (_, loan) => {
        const d = doMap[loan.loanId];
        const p = paymentMap[loan.loanId];

        const net = asInt(d?.do_netDOAmount);
        const paid =
          asInt(p?.entryTotals?.paymentAmountLoan || 0) +
          asInt(p?.entryTotals?.paymentAmountAutocredits || 0) +
          asInt(p?.entryTotals?.paymentAmountCustomer || 0);
        const outstanding = net > 0 ? Math.max(0, net - paid) : 0;

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div className="text-[11px] text-muted-foreground">Net DO</div>
            <Text>{net > 0 ? money(net) : "—"}</Text>

            <div className="text-[11px] text-muted-foreground mt-1">
              Paid / Outstanding
            </div>
            <Text>
              {paid > 0 ? money(paid) : "—"}{" "}
              <Text type={outstanding > 0 ? "danger" : "secondary"}>
                ({money(outstanding)})
              </Text>
            </Text>
          </div>
        );
      },
    },
    {
      title: "Autocredits Account",
      key: "autocredits",
      width: 260,
      render: (_, loan) => {
        const p = paymentMap[loan.loanId];
        const received = asInt(p?.autocreditsTotals?.receiptAmountTotal || 0);

        // if you later store closing balance / netReceivable in payments,
        // you can surface it here; for now show total receipts + simple tag.
        const isVerifiedShowroom = !!p?.isVerified;
        const isAutocreditsVerified = !!p?.isAutocreditsVerified;

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div className="text-[11px] text-muted-foreground">
              Receipts from Customer
            </div>
            <Text>{received > 0 ? money(received) : "—"}</Text>

            <div style={{ marginTop: 4 }}>
              {isVerifiedShowroom && (
                <Tag color="gold" style={{ marginBottom: 4 }}>
                  Showroom Verified
                </Tag>
              )}
              {isAutocreditsVerified && (
                <Tag color="purple">Autocredits Verified</Tag>
              )}
              {!isVerifiedShowroom && !isAutocreditsVerified && (
                <Tag color="default">Draft</Tag>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: "Last Updated",
      key: "updated",
      width: 160,
      render: (_, loan) => {
        const p = paymentMap[loan.loanId];
        const ts = p?.updatedAt || p?.createdAt;
        if (!ts) return "—";
        const d = new Date(ts);
        return (
          <Text type="secondary" style={{ fontSize: 11 }}>
            {d.toLocaleDateString("en-IN")}{" "}
            {d.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        );
      },
    },
    {
      title: "Status / Actions",
      key: "statusActions",
      width: 220,
      fixed: "right",
      render: (_, loan) => {
        const p = paymentMap[loan.loanId];
        const exists = !!p;

        const hasShowroom = !!p?.showroomRows?.length;
        const hasAutocredits = !!p?.autocreditsRows?.length;

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div>
              {exists ? (
                <Tag color={hasShowroom && hasAutocredits ? "green" : "orange"}>
                  {hasShowroom && hasAutocredits
                    ? "Both Accounts Created"
                    : hasShowroom
                    ? "Showroom Only"
                    : "Autocredits Only"}
                </Tag>
              ) : (
                <Tag color="red">Not Created</Tag>
              )}
            </div>

            <Space>
              {!exists ? (
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => navigate(`/payments/${loan.loanId}`)}
                >
                  Create
                </Button>
              ) : (
                <>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/payments/${loan.loanId}`)}
                  >
                    Edit
                  </Button>

                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/payments/${loan.loanId}?view=1`)}
                  >
                    View
                  </Button>
                </>
              )}
            </Space>
          </div>
        );
      },
    },
  ];

  const tableData = filteredLoans.map((l) => ({
    ...l,
    key: l.loanId,
  }));

  return (
    <div className="p-5">
      <Card className="rounded-xl mb-4">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="font-extrabold text-lg text-foreground">
              Payments Dashboard
            </div>
            <div className="text-muted-foreground mt-1">
              Showroom payments, Autocredits receipts, and verification status
              in one view.
            </div>
          </div>

          <Space>
            <Tooltip title="Reload from localStorage">
              <Button icon={<ReloadOutlined />} onClick={loadData}>
                Refresh
              </Button>
            </Tooltip>

            <Button onClick={() => navigate("/loans")}>Go to Loans</Button>
            <Button onClick={() => navigate("/delivery-orders")}>
              Go to DO
            </Button>
          </Space>
        </div>

        <div className="mt-3.5">
          <Input
            placeholder="Search by Loan ID / Customer / Vehicle / Source..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 420 }}
          />
        </div>
      </Card>

      {/* TOP SUMMARY */}
      <Row gutter={[12, 12]} className="mb-4">
        <Col xs={24} md={8}>
          <Card className="rounded-xl">
            <div className="text-xs text-muted-foreground">
              Total Payments Made (Showroom)
            </div>
            <div className="text-lg font-extrabold mt-1.5">
              {money(totals.totalPaidToShowroom)}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card className="rounded-xl">
            <div className="text-xs text-muted-foreground">
              Total Outstanding (Showroom)
            </div>
            <div className="text-lg font-extrabold mt-1.5">
              {money(totals.totalOutstandingToShowroom)}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card className="rounded-xl">
            <div className="text-xs text-muted-foreground">
              Total Receipts Received (Autocredits)
            </div>
            <div className="text-lg font-extrabold mt-1.5">
              {money(totals.totalReceivedByAutocredits)}
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="rounded-xl">
        <Table
          columns={columns}
          dataSource={tableData}
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default PaymentsDashboard;
