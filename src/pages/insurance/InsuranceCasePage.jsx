import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Breadcrumb, Button, Card, Space, Typography } from "antd";
import { ShieldCheck, Plus, PencilLine } from "lucide-react";
import NewInsuranceCaseForm from "../../components/insurance/NewInsuranceCaseForm";

const { Title, Text } = Typography;

const InsuranceCasePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { caseId } = useParams();

  const isEditMode = Boolean(caseId);
  const initialValues = location?.state?.caseData || null;

  const handleSubmit = () => {
    navigate("/insurance");
  };

  return (
    <Space direction="vertical" size={16} style={{ width: "100%", paddingBottom: 24 }}>
      <Card bordered>
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Breadcrumb
            items={[
              {
                title: (
                  <Button type="link" style={{ padding: 0 }} onClick={() => navigate("/insurance")}>
                    Insurance
                  </Button>
                ),
              },
              { title: isEditMode ? "Edit Case" : "New Case" },
            ]}
          />

          <Space align="center" size={12}>
            <span
              style={{
                display: "inline-flex",
                width: 40,
                height: 40,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                background: isEditMode ? "rgba(250, 173, 20, 0.12)" : "rgba(29, 155, 240, 0.12)",
              }}
            >
              {isEditMode ? <PencilLine size={18} /> : <Plus size={18} />}
            </span>
            <div>
              <Text type="secondary" style={{ display: "block", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 700 }}>
                Insurance Case
              </Text>
              <Title level={3} style={{ margin: 0 }}>
                {isEditMode ? `Edit Case — ${caseId}` : "New Insurance Case"}
              </Title>
            </div>
          </Space>

          {isEditMode ? (
            <Text type="secondary">
              <ShieldCheck size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
              Editing existing case — changes will update the record.
            </Text>
          ) : null}
        </Space>
      </Card>

      <NewInsuranceCaseForm
        mode={isEditMode ? "edit" : "create"}
        initialValues={initialValues}
        onCancel={() => navigate("/insurance")}
        onSubmit={handleSubmit}
      />
    </Space>
  );
};

export default InsuranceCasePage;
