import React, { useMemo } from 'react';
import { Button, Tag, Divider, Steps } from 'antd';
import Icon from '../../../../components/AppIcon';

const CasePreviewPanel = ({ selectedCase, onClose, onNavigate }) => {
  // Normalize data
  const caseData = useMemo(() => {
    if (!selectedCase) return null;

    return {
      ...selectedCase,
      caseId: selectedCase.caseId || selectedCase.loanId,
      customerPhone: selectedCase.customerPhone || selectedCase.primaryMobile || 'N/A',
      currentStage: selectedCase.currentStage || 'profile',
      status: selectedCase.status || 'Pending',
      updatedAt: selectedCase.updatedAt ? new Date(selectedCase.updatedAt).toLocaleDateString() : 'Just now',
      vehicleName: `${selectedCase.vehicleMake || ''} ${selectedCase.vehicleModel || ''}`.trim() || 'Vehicle not selected',
      vehicleVariant: selectedCase.vehicleVariant || 'Variant not specified',
    };
  }, [selectedCase]);

  if (!caseData) return null;

  // Status Colors
  const getStatusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s === 'disbursed') return 'success';
    if (s === 'approved') return 'success';
    if (s === 'rejected') return 'error';
    return 'warning'; // default/pending
  };

  const statusColor = getStatusColor(caseData.status);

  // Detailed lifecycle stages for the Steps component
  const lifecycleStages = [
    { title: "Profile", key: "profile" },
    { title: "Pre-File", key: "pre-file" },
    { title: "Login", key: "login" },
    { title: "Approval", key: "approval" },
    { title: "Post-File", key: "post-file" },
    { title: "Disbursal", key: "disbursement" },
    { title: "Docs", key: "documents" },
    { title: "Insurance", key: "insurance" },
    { title: "Invoice", key: "invoice" },
    { title: "Delivery", key: "vehicle-delivery" },
    { title: "RC", key: "rc" },
  ];

  // Attempt to find current step index
  const getCurrentStep = () => {
    const stage = (caseData.currentStage || "").toLowerCase();
    // Direct match
    let idx = lifecycleStages.findIndex(s => s.key === stage);
    if (idx !== -1) return idx;
    
    // Fuzzy/Fallback Mapping
    if (stage.includes('profile')) return 0;
    if (stage.includes('pre')) return 1;
    if (stage.includes('login')) return 2;
    if (stage.includes('approv')) return 3;
    if (stage.includes('post')) return 4;
    if (stage.includes('disburs')) return 5;
    if (stage.includes('doc')) return 6;
    if (stage.includes('insur')) return 7;
    if (stage.includes('inv')) return 8;
    if (stage.includes('deliv')) return 9;
    if (stage.includes('rc')) return 10;

    return 0;
  };

  const currentStep = getCurrentStep();

  const formatCurrency = (val) => {
     if (!val) return '—';
     return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  return (
    <div className="h-full w-full bg-card flex flex-col border-none">
      {/* HEADER */}
      <div className="flex-none px-6 py-3 border-b border-border/50 bg-card flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                   <Icon name="FileText" size={18} />
                </div>
                <div>
                   <h3 className="text-base font-bold text-foreground leading-tight">Case {caseData.caseId}</h3>
                   <div className="text-[10px] text-muted-foreground">Last updated: {caseData.updatedAt}</div>
                </div>
            </div>
            <div className="h-6 w-px bg-border/60 mx-2" />
            <Tag color={statusColor} className="m-0 border-none px-2 rounded-full font-bold text-[10px] uppercase tracking-wider">
               {caseData.status?.toUpperCase()}
            </Tag>
         </div>
         <button 
           onClick={onClose} 
           className="w-8 h-8 rounded-full hover:bg-muted/50 flex items-center justify-center text-muted-foreground transition-colors"
         >
            <Icon name="X" size={18} />
         </button>
      </div>

      {/* BODY - Flex Layout */}
      <div className="flex-1 p-5 overflow-hidden flex gap-6 items-stretch">
            
            {/* SECTION 1: ENTITIES (Customer & Vehicle) - Reduced Width */}
            <div className="w-[240px] flex-none flex flex-col justify-start pt-2 gap-5 pr-6 border-r border-border/40 overflow-y-auto custom-scrollbar">
                {/* Customer */}
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center mt-0.5">
                        <Icon name="User" size={18} />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Customer</div>
                        <div className="font-bold text-sm text-foreground line-clamp-1">{caseData.customerName || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{caseData.customerPhone}</div>
                    </div>
                </div>

                {/* Vehicle */}
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 flex items-center justify-center mt-0.5">
                        <Icon name="CarFront" size={18} />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Vehicle</div>
                        <div className="font-bold text-sm text-foreground line-clamp-1">{caseData.vehicleName}</div>
                        <div className="text-xs text-muted-foreground">{caseData.vehicleVariant}</div>
                    </div>
                </div>
            </div>

            {/* SECTION 2: FINANCIALS & TIMELINE - Flexible */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden min-w-0">
                {/* Funding Parameters */}
                <div className="flex-none px-2">
                    <div className="text-[10px] uppercase font-medium text-muted-foreground mb-3 tracking-wider">Funding Parameters</div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-medium text-muted-foreground mb-1">Type of Loan</span>
                            <div className="text-sm font-medium text-foreground">{caseData.typeOfLoan || caseData.loanType || '—'}</div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-medium text-muted-foreground mb-1">Expected Funding</span>
                            <div className="text-sm font-medium text-foreground">{caseData.financeExpectation ? formatCurrency(caseData.financeExpectation) : '—'}</div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-medium text-muted-foreground mb-1">Requested Tenure</span>
                            <div className="text-sm font-medium text-foreground">{caseData.loanTenureMonths ? `${caseData.loanTenureMonths} Months` : '—'}</div>
                        </div>
                    </div>
                </div>

                <Divider className="my-0 border-border/40" />

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-4 flex-none px-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-medium text-muted-foreground mb-1">Loan Amount</span>
                        <div className="text-lg font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(caseData.loanAmount)}</div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-medium text-muted-foreground mb-1">Tenure</span>
                        <div className="text-base font-medium text-foreground">{caseData.approval_tenureMonths ? `${caseData.approval_tenureMonths} Mon` : '—'}</div>
                    </div>
                    <div className="flex flex-col">
                         <span className="text-[10px] uppercase font-medium text-muted-foreground mb-1">ROI</span>
                         <div className="text-base font-medium text-foreground">{caseData.approval_roi ? `${caseData.approval_roi}%` : '—'}</div>
                    </div>
                    <div className="flex flex-col">
                         <span className="text-[10px] uppercase font-medium text-muted-foreground mb-1">Bank</span>
                         <div className="text-base font-medium text-foreground line-clamp-1">{caseData.bankName || 'Pending'}</div>
                    </div>
                </div>

                <Divider className="my-0 border-border/40" />

                {/* References */}
                <div className="flex-none px-2">
                    <div className="text-[10px] uppercase font-medium text-muted-foreground mb-3 tracking-wider">References</div>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Reference 1 */}
                        <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                            <div className="text-[10px] uppercase font-medium text-muted-foreground mb-1">Reference 1</div>
                            <div>
                                <div className="text-xs text-muted-foreground">Name</div>
                                <div className="text-sm font-medium text-foreground">{caseData.reference1_name || '—'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Mobile No</div>
                                <div className="text-sm font-medium text-foreground">{caseData.reference1_mobile || '—'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Address</div>
                                <div className="text-sm font-medium text-foreground line-clamp-2">{caseData.reference1_address || '—'}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <div className="text-xs text-muted-foreground">Pincode</div>
                                    <div className="text-sm font-medium text-foreground">{caseData.reference1_pincode || '—'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">City</div>
                                    <div className="text-sm font-medium text-foreground">{caseData.reference1_city || '—'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Reference 2 */}
                        <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                            <div className="text-[10px] uppercase font-medium text-muted-foreground mb-1">Reference 2</div>
                            <div>
                                <div className="text-xs text-muted-foreground">Name</div>
                                <div className="text-sm font-medium text-foreground">{caseData.reference2_name || '—'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Mobile No</div>
                                <div className="text-sm font-medium text-foreground">{caseData.reference2_mobile || '—'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Address</div>
                                <div className="text-sm font-medium text-foreground line-clamp-2">{caseData.reference2_address || '—'}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <div className="text-xs text-muted-foreground">Pincode</div>
                                    <div className="text-sm font-medium text-foreground">{caseData.reference2_pincode || '—'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">City</div>
                                    <div className="text-sm font-medium text-foreground">{caseData.reference2_city || '—'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <Divider className="my-0 border-border/40" />

                {/* Timeline (Ant Design Steps) */}
                <div className="flex-1 flex flex-col justify-center overflow-x-auto pb-4 custom-scrollbar">
                    <div className="min-w-[800px] px-2"> {/* Min width to ensure steps don't squish too much */}
                        <Steps 
                            size="small" 
                            current={currentStep} 
                            items={lifecycleStages}
                            className="w-full"
                        />
                    </div>
                </div>
            </div>

            {/* SECTION 3: ACTIONS - Fixed Width */}
            <div className="w-[180px] flex-none flex flex-col justify-start pt-2 gap-3 pl-6 border-l border-border/40">
                <Button 
                    type="primary" 
                    block
                    className="h-9 font-semibold bg-blue-600 hover:bg-blue-700 border-none"
                    onClick={() => onNavigate(selectedCase, 'edit')}
                    icon={<Icon name="Edit3" size={14} />}
                >
                   Edit Case
                </Button>

                <Button 
                    block
                    className="h-9 hover:bg-muted/50 hover:text-foreground"
                    onClick={() => onNavigate(selectedCase, 'view')}
                    icon={<Icon name="Eye" size={14} />}
                >
                   View Details
                </Button>
            </div>
      </div>
    </div>
  );
};

export default CasePreviewPanel;
