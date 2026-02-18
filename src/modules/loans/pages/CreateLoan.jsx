
import React from "react";
import { useNavigate } from "react-router-dom";
import LoanFormWithSteps from "../components/LoanFormWithSteps";
import Button from "../../../components/ui/Button";

const CreateLoan = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full">
        <div className="flex items-center justify-between gap-3 px-4 md:px-8 py-4 border-b border-border bg-card">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              New Loan Case
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Create a new loan application
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={() => navigate("/loans")}>
            Cancel
          </Button>
        </div>
        <LoanFormWithSteps />
      </div>
    </div>
  );
};

export default CreateLoan;
