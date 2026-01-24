import React from "react";
import PostFileApprovalDetails from "./PostFileApprovalDetails";
import PostFileVehicleVerification from "./PostFileVehicleVerification";
import PostFileInstrumentDetails from "./PostFileInstrumentDetails";
import PostFileDocumentManagement from "./PostFileDocumentManagement";
import PostFileDispatchAndRecords from "./PostFileDispatchAndRecords";

const PostFileStep = ({ form }) => {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Top row: Approval Details (50%) + Vehicle Verification (50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <PostFileApprovalDetails form={form} />
        <PostFileVehicleVerification form={form} />
      </div>

      {/* Full width: Instrument Details */}
      <PostFileInstrumentDetails form={form} />

      {/* Full width: Document Management */}
      <PostFileDocumentManagement form={form} />
      <PostFileDispatchAndRecords form={form} />
    </div>
  );
};

export default PostFileStep;
