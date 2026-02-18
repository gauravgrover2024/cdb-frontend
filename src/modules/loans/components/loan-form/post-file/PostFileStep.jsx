import React from "react";
import PostFileApprovalDetails from "./PostFileApprovalDetails";
import PostFileVehicleVerification from "./PostFileVehicleVerification";
import PostFileInstrumentDetails from "./PostFileInstrumentDetails";
import PostFileDocumentManagement from "./PostFileDocumentManagement";
import PostFileDispatchAndRecords from "./PostFileDispatchAndRecords";
import EMICalculator from "./EMICalculator";
import RepaymentSchedule from "./RepaymentSchedule";
import PrincipalOutstanding from "./PrincipalOutstanding";
import DocumentsList from "./DocumentsList";

const PostFileStep = ({ form }) => {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-card rounded-xl p-4 md:p-5 border border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary text-lg font-bold">📋</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Post-File Management</h2>
            <p className="text-sm text-muted-foreground">Complete disbursement verification and documentation</p>
          </div>
        </div>
      </div>

      {/* Top row: Approval Details (50%) + Vehicle Verification (50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PostFileApprovalDetails form={form} />
        <PostFileVehicleVerification form={form} />
      </div>

      {/* Full width: Instrument Details */}
      <PostFileInstrumentDetails form={form} />

      {/* EMI Calculator & Principal Outstanding */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EMICalculator form={form} mode="integrated" />
        <PrincipalOutstanding form={form} />
      </div>

      {/* Full width: Repayment Schedule */}
      <RepaymentSchedule form={form} />

      {/* Full width: Document Management */}
      <PostFileDocumentManagement form={form} />
      
      {/* Dispatch & Records */}
      <PostFileDispatchAndRecords form={form} />
      
      {/* Documents List - Below Record Details */}
      <DocumentsList form={form} />
    </div>
  );
};

export default PostFileStep;
