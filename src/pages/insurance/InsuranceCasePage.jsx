import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Spin, Typography } from "antd";
import { ShieldCheck, Plus, PencilLine } from "lucide-react";
import NewInsuranceCaseForm from "../../components/insurance/NewInsuranceCaseForm";
import { insuranceApi } from "../../api/insurance";
import { addOnCatalog } from "../../components/insurance/steps/allSteps";

const { Text } = Typography;

const normalizePolicyType = (value) => {
  const raw = String(value || "").trim();
  const lower = raw.toLowerCase();
  if (!raw) return "";
  if (lower === "own damage" || lower === "od" || lower === "sod") {
    return "Stand Alone OD";
  }
  if (lower === "tp" || lower.includes("third party")) return "Third Party";
  if (lower.includes("comprehensive")) return "Comprehensive";
  return raw;
};

// The just-expiring policy's OD/TP/add-on/IDV breakup only lives inside its
// accepted quote row (case-level fields only carry the aggregate IDV/premium),
// so pull it from there for the renewal's "previous policy" premium fields.
const getAcceptedQuotePremiumBreakup = (caseDoc) => {
  const quotes = Array.isArray(caseDoc?.quotes) ? caseDoc.quotes : [];
  const acceptedId = caseDoc?.acceptedQuoteId;
  const accepted =
    quotes.find(
      (q, idx) =>
        String(q?.id ?? q?._id ?? q?.quoteId ?? `quote-${idx}`) ===
        String(acceptedId),
    ) ||
    quotes.find((q) => q?.isAccepted) ||
    null;
  if (!accepted) return null;

  const odAmount = Number(
    accepted.odAmount ??
      accepted.ownDamage ??
      accepted.basicOwnDamage ??
      accepted.odPremium ??
      0,
  );
  const thirdPartyAmount = Number(
    accepted.thirdPartyAmount ??
      accepted.thirdParty ??
      accepted.basicThirdParty ??
      accepted.tpPremium ??
      0,
  );
  const addOnsAmount = Number(accepted.addOnsAmount || 0);
  const vehicleIdv = Number(accepted.vehicleIdv || 0);
  const cngIdv = Number(accepted.cngIdv || 0);
  const accessoriesIdv = Number(accepted.accessoriesIdv || 0);
  const totalIdv =
    vehicleIdv + cngIdv + accessoriesIdv || Number(accepted.totalIdv || 0);
  const totalPremium = Number(
    caseDoc?.newTotalPremium || odAmount + thirdPartyAmount + addOnsAmount || 0,
  );
  const includedMap =
    accepted.addOnsIncluded && typeof accepted.addOnsIncluded === "object"
      ? accepted.addOnsIncluded
      : {};
  const addOnsMap =
    accepted.addOns && typeof accepted.addOns === "object"
      ? accepted.addOns
      : {};
  const selectedAddOns = addOnCatalog.filter(
    (name) => includedMap[name] || Number(addOnsMap[name]) > 0,
  );

  return {
    previousIdvAmount: totalIdv,
    previousOwnDamageAmount: odAmount,
    previousBasicOwnDamageAmount: odAmount,
    previousThirdPartyAmount: thirdPartyAmount,
    previousBasicThirdPartyAmount: thirdPartyAmount,
    previousAddOnsTotal: addOnsAmount,
    previousTotalPremium: totalPremium,
    previousSelectedAddOns: selectedAddOns,
  };
};

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
      const normalizedPolicyType = normalizePolicyType(
        renewFromCase.newPolicyType ||
          renewFromCase.coverageType ||
          renewFromCase.previousPolicyType ||
          "",
      );
      const premiumBreakup = getAcceptedQuotePremiumBreakup(renewFromCase) || {};
      return {
        ...renewFromCase,
        _id: undefined,
        id: undefined,
        caseId: undefined,
        status: "draft",
        currentStep: 3,
        isRenewal: true,
        renewedFromCaseId: renewFromCase._id || renewFromCase.id,
        renewalFollowUpStatus: "pending",
        vehicleType: "Used Car",
        claimTakenLastYear: "",
        previousInsuranceCompany: renewFromCase.newInsuranceCompany || "",
        previousPolicyNumber: renewFromCase.newPolicyNumber || "",
        previousPolicyType: normalizedPolicyType,
        previousPolicyStartDate: renewFromCase.newPolicyStartDate || "",
        previousPolicyDuration: renewFromCase.newInsuranceDuration || "",
        previousOdExpiryDate: renewFromCase.newOdExpiryDate || "",
        previousTpExpiryDate: renewFromCase.newTpExpiryDate || "",
        previousNcbDiscount: renewFromCase.newNcbDiscount || 0,
        previousHypothecation: renewFromCase.newHypothecation || "",
        previousRemarks: renewFromCase.newRemarks || "",
        ...premiumBreakup,
        newInsuranceCompany: "",
        newPolicyNumber: "",
        newPolicyType: normalizedPolicyType || "Comprehensive",
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
      if (!isEditMode && !isRenewalMode) {
        setLoadedCase(null);
        setRenewFromCase(null);
        setLoading(false);
        setError("");
        return;
      }

      if (isRenewalMode && renewFromId) {
        setLoading(true);
        setError("");
        try {
          const res = await insuranceApi.getById(renewFromId);
          const doc = res?.data?.data ?? res?.data ?? res;
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
        const doc = res?.data?.data ?? res?.data ?? res;
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
          key={location.search}
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
