import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Button,
  Tag,
  Space,
  Table,
  Input,
  Typography,
  Tooltip,
  message,
} from "antd";
import { useNavigate } from "react-router-dom";
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Text } = Typography;

const safeText = (v) => (v === undefined || v === null ? "" : String(v));

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const money = (n) => `₹ ${asInt(n).toLocaleString("en-IN")}`;

// ✅ API helper
const fetchAllDOs = async () => {
  const res = await fetch("/api/do");
  if (!res.ok) throw new Error("Failed to load DO list");
  return res.json(); // array
};

const DeliveryOrderDashboard = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingDOs, setLoadingDOs] = useState(false);

  const loadLoansFromLocal = () => {
    const savedLoans = JSON.parse(localStorage.getItem("savedLoans") || "[]");
    setLoans(savedLoans);
  };

  const loadDOsFromMongo = async () => {
    try {
      setLoadingDOs(true);
      const docs = await fetchAllDOs();
      setDeliveryOrders(Array.isArray(docs) ? docs : []);
    } catch (err) {
      console.error("Load DO Dashboard Error:", err);
      message.error("Failed to load Delivery Orders from server ❌");
    } finally {
      setLoadingDOs(false);
    }
  };

  const loadData = async () => {
    loadLoansFromLocal();
    await loadDOsFromMongo();
  };

  useEffect(() => {
    loadData();
  }, []);

  // map DO by loanId
  const doMap = useMemo(() => {
    const map = {};
    (deliveryOrders || []).forEach((d) => {
      if (d?.loanId) map[d.loanId] = d;
      if (d?.do_loanId) map[d.do_loanId] = d; // fallback
    });
    return map;
  }, [deliveryOrders]);

  const filteredLoans = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return loans;

    return (loans || []).filter((l) => {
      const vehicle = `${safeText(l.vehicleMake)} ${safeText(l.vehicleModel)}`;
      return (
        safeText(l.loanId).toLowerCase().includes(s) ||
        safeText(l.customerName).toLowerCase().includes(s) ||
        vehicle.toLowerCase().includes(s) ||
        safeText(l.recordSource).toLowerCase().includes(s) ||
        safeText(l.sourceName).toLowerCase().includes(s)
      );
    });
  }, [loans, search]);

  const columns = [
    {
      title: "Loan ID",
      dataIndex: "loanId",
      key: "loanId",
      width: 150,
      render: (val) => <Text strong>{val}</Text>,
    },
    {
      title: "Customer",
      dataIndex: "customerName",
      key: "customerName",
      width: 200,
      render: (val) => safeText(val) || "—",
    },
    {
      title: "Vehicle",
      key: "vehicle",
      width: 220,
      render: (_, loan) =>
        `${safeText(loan.vehicleMake)} ${safeText(
          loan.vehicleModel
        )} ${safeText(loan.vehicleVariant)}`.trim() || "—",
    },
    {
      title: "Type",
      key: "type",
      width: 120,
      render: (_, loan) => {
        const financed = safeText(loan?.isFinanced).toLowerCase() === "yes";
        return financed ? (
          <Tag color="blue">Financed</Tag>
        ) : (
          <Tag color="green">Cash</Tag>
        );
      },
    },
    {
      title: "DO Status",
      key: "status",
      width: 130,
      render: (_, loan) => {
        const doExists = !!doMap[loan.loanId];
        return doExists ? (
          <Tag color="green">Created</Tag>
        ) : (
          <Tag color="red">Not Created</Tag>
        );
      },
    },
    {
      title: "DO Ref No",
      key: "refNo",
      width: 170,
      render: (_, loan) => {
        const d = doMap[loan.loanId];
        return d?.do_refNo || "—";
      },
    },
    {
      title: "DO Date",
      key: "doDate",
      width: 140,
      render: (_, loan) => {
        const d = doMap[loan.loanId];
        if (!d?.do_date) return "—";
        return dayjs(d.do_date).isValid()
          ? dayjs(d.do_date).format("DD-MM-YYYY")
          : "—";
      },
    },
    {
      title: "Net DO",
      key: "netdo",
      width: 140,
      render: (_, loan) => {
        const d = doMap[loan.loanId];
        const net = asInt(d?.do_netDOAmount);
        return net > 0 ? money(net) : "—";
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 240,
      fixed: "right",
      render: (_, loan) => {
        const doExists = !!doMap[loan.loanId];

        return (
          <Space>
            {!doExists ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate(`/delivery-orders/${loan.loanId}`)}
              >
                Create DO
              </Button>
            ) : (
              <>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/delivery-orders/${loan.loanId}`)}
                >
                  Edit
                </Button>

                <Button
                  icon={<EyeOutlined />}
                  onClick={() =>
                    navigate(`/delivery-orders/${loan.loanId}?view=1`)
                  }
                >
                  View
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
    <div style={{ padding: 20 }}>
      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              Delivery Orders Dashboard
            </div>
            <div style={{ color: "#666", marginTop: 4 }}>
              Create / Edit / View DO for each loan case.
            </div>
          </div>

          <Space>
            <Tooltip title="Reload Loans (localStorage) + DOs (Mongo)">
              <Button
                icon={<ReloadOutlined />}
                onClick={loadData}
                loading={loadingDOs}
              >
                Refresh
              </Button>
            </Tooltip>

            <Button onClick={() => navigate("/loans")}>Go to Loans</Button>
          </Space>
        </div>

        <div style={{ marginTop: 14 }}>
          <Input
            placeholder="Search by Loan ID / Customer / Vehicle / Source..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 420 }}
          />
        </div>
      </Card>

      <Card style={{ borderRadius: 12 }}>
        <Table
          columns={columns}
          dataSource={tableData}
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default DeliveryOrderDashboard;
