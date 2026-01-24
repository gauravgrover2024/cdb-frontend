import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import LoanFormWithSteps from "../components/LoanFormWithSteps";
import Button from "../../../components/ui/Button";

const EditLoan = () => {
  const navigate = useNavigate();
  const { loanId } = useParams();

  const [loading, setLoading] = useState(true);
  const [loan, setLoan] = useState(null);
  const [error, setError] = useState("");

  const fetchLoan = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/loans/${loanId}`);
      if (!res.ok) throw new Error("Failed to load loan");

      const data = await res.json();
      setLoan(data || null);
    } catch (e) {
      console.error("EditLoan fetch error:", e);
      setError(e.message || "Failed to load loan");
      setLoan(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loanId) return;
    fetchLoan();
  }, [loanId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">Loading loan...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-base font-semibold text-foreground">
          Unable to load loan
        </div>
        <div className="text-sm text-muted-foreground">{error}</div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/loans")}>
            Back to Dashboard
          </Button>
          <Button variant="default" onClick={fetchLoan}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-base font-semibold text-foreground">
          Loan not found
        </div>
        <Button variant="outline" onClick={() => navigate("/loans")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 lg:p-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Edit Loan
            </h1>
            <p className="text-sm text-muted-foreground">
              Loan ID: <span className="font-medium">{loanId}</span>
            </p>
          </div>

          <Button variant="outline" onClick={() => navigate("/loans")}>
            Back
          </Button>
        </div>

        {/* ✅ This will open your existing multi-step form in edit mode */}
        <LoanFormWithSteps mode="edit" initialData={loan} />
      </div>
    </div>
  );
};

export default EditLoan;
