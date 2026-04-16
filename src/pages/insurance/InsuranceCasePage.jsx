import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Spin, Typography } from "antd";
import { ShieldCheck, Plus, PencilLine } from "lucide-react";
import NewInsuranceCaseForm from "../../components/insurance/NewInsuranceCaseForm";
import { insuranceApi } from "../../api/insurance";

const { Text } = Typography;

const InsuranceCasePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { caseId } = useParams();

  const isEditMode = Boolean(caseId);
  const stateSeed = location?.state?.caseData || null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadedCase, setLoadedCase] = useState(null);
  const [renewFromCase, setRenewFromCase] = useState(null);

  const queryParams = new URLSearchParams(location.search);
  const renewFromId = queryParams.get("renewFrom");
  const isExtendMode = queryParams.get("extend") === "true";
  const isRenewalMode = Boolean(renewFromId);

  const initialValues = useMemo(() => {
    if (renewFromCase) {
      return {
        ...renewFromCase,
        _id: undefined,
        id: undefined,
        caseId: undefined,
        status: "draft",
        currentStep: 4,
        isRenewal: true,
        renewedFromCaseId: renewFromCase._id || renewFromCase.id,
        vehicleType: "Used Car",
        claimTakenLastYear: "",
        previousInsuranceCompany: renewFromCase.newInsuranceCompany || "",
        previousPolicyNumber: renewFromCase.newPolicyNumber || "",
        previousPolicyType: renewFromCase.newPolicyType || "",
        previousPolicyStartDate: renewFromCase.newPolicyStartDate || "",
        previousPolicyDuration: renewFromCase.newInsuranceDuration || "",
        previousOdExpiryDate: renewFromCase.newOdExpiryDate || "",
        previousTpExpiryDate: renewFromCase.newTpExpiryDate || "",
        previousNcbDiscount: renewFromCase.newNcbDiscount || 0,
        previousHypothecation: renewFromCase.newHypothecation || "",
        previousRemarks: renewFromCase.newRemarks || "",
        newInsuranceCompany: "",
        newPolicyNumber: "",
        newPolicyType: renewFromCase.newPolicyType || "Comprehensive",
        newIssueDate: "",
        newPolicyStartDate: "",
        newOdExpiryDate: "",
        newTpExpiryDate: "",
        quotes: [],
        acceptedQuoteId: null,
        documents: [],
        customerPaymentExpected: 0,
        customerPaymentReceived: 0,
        inhousePaymentExpected: 0,
        inhousePaymentReceived: 0,
        paymentHistory: [],
        // Reset pricing and payout fields for renewal
        exShowroomPrice: renewFromCase.exShowroomPrice || 0,
        dateOfSale: renewFromCase.dateOfSale || "",
        dateOfPurchase: renewFromCase.dateOfPurchase || "",
        odometerReading: renewFromCase.odometerReading || 0,
        policyPurchaseDate: "",
        ewCommencementDate: "",
        ewExpiryDate: "",
        kmsCoverage: 0,
        insurance_receivables: [],
        insurance_payables: [],
      };
    }
    return loadedCase || stateSeed || null;
  }, [loadedCase, stateSeed, renewFromCase]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (isRenewalMode && renewFromId) {
        setLoading(true);
        setError("");
        try {
          const res = await insuranceApi.getById(renewFromId);
          const doc = res?.data || res;
          if (!cancelled) setRenewFromCase(doc);
        } catch (e) {
          console.error("[InsuranceCasePage] renewal load failed:", e);
          if (!cancelled)
            setError(
              e?.message || "Failed to load case for renewal"
            );
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      if (!isEditMode || !caseId) return;
      setLoading(true);
      setError("");
      try {
        const res = await insuranceApi.getById(caseId);
        const doc = res?.data || res;
        if (!cancelled) setLoadedCase(doc);
      } catch (e) {
        console.error("[InsuranceCasePage] load failed:", e);
        if (!cancelled) setError(e?.message || "Failed to load insurance case");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [caseId, isEditMode, renewFromId, isRenewalMode]);

  const handleSubmit = () => {
    navigate("/insurance");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full">
        <div className="flex items-center justify-between gap-3 px-4 py-5 md:px-8 md:py-6 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <span
              style={{
                display: "inline-flex",
                width: 40,
                height: 40,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                background: isEditMode
                  ? "rgba(250, 173, 20, 0.12)"
                  : "rgba(29, 155, 240, 0.12)",
              }}
            >
              {isEditMode ? <PencilLine size={18} /> : <Plus size={18} />}
            </span>
            <div>
              <Text
                type="secondary"
                style={{
                  display: "block",
                  fontSize: 12,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Insurance Case
              </Text>
              <h1 className="text-xl font-semibold text-foreground">
                {isExtendMode
                  ? "Extend Insurance/Warranty"
                  : isRenewalMode
                    ? "Renew Insurance Policy"
                    : isEditMode
                      ? `Edit Case — ${caseId}`
                      : "New Insurance Case"}
              </h1>
              {isEditMode && !isRenewalMode ? (
                <Text type="secondary">
                  <ShieldCheck
                    size={14}
                    style={{ verticalAlign: "-2px", marginRight: 6 }}
                  />
                  Editing existing case
                </Text>
              ) : null}
            </div>
          </div>

          <Button onClick={() => navigate("/insurance")}>Cancel</Button>
        </div>

        <div className="px-4 py-6 md:px-8 md:py-8 space-y-4">
          {isRenewalMode ? (
            <Alert
              type="info"
              showIcon
              message={isExtendMode ? "Extension Mode" : "Renewal Mode"}
              description={
                isExtendMode
                  ? "Customer and vehicle details copied. Proceed to Step 5 to add Extended Warranty details."
                  : "Customer, vehicle, and previous policy details copied. Select 'Claim Taken Last Year' in Step 3, then proceed to quotations."
              }
            />
          ) : null}

          {error ? <Alert type="error" showIcon message={error} /> : null}

          <Spin spinning={loading}>
            <NewInsuranceCaseForm
              mode={isEditMode ? "edit" : "create"}
              initialValues={initialValues}
              onCancel={() => navigate("/insurance")}
              onSubmit={handleSubmit}
              onDelete={() => navigate("/insurance")}
            />
          </Spin>
        </div>
      </div>
    </div>
  );
};

export default InsuranceCasePage;
