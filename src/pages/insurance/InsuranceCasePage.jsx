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
    <div className="min-h-screen bg-transparent">
      {error ? (
        <div className="p-4">
          <Alert type="error" showIcon message={error} />
        </div>
      ) : null}

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
  );
};

export default InsuranceCasePage;
