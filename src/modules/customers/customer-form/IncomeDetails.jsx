import React from "react";
import { Form, Input, InputNumber, Row, Col } from "antd";
import Icon from "../../../components/AppIcon";
import DocumentUpload from "../../../components/ui/DocumentUpload";
import { formatINRInput, parseINRInput } from "../../../utils/currency";

const IncomeDetails = () => {
  const form = Form.useFormInstance();
  const isFinanced = Form.useWatch("isFinanced", form);

  // Show in customer module & financed loans
  const showIncome = isFinanced !== "No";

  if (!showIncome) {
    return null;
  }

  return (
    <div 
        id="section-income" 
        className="form-section bg-card border border-border/50 rounded-2xl p-6 shadow-sm mb-6"
        style={{ background: "var(--card)" }}
    >
      {/* SECTION HEADER */}
      <div className="section-header mb-6 flex justify-between items-center">
         <div className="section-title flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
               <Icon name="Wallet" size={20} />
            </div>
            <span className="text-lg font-bold text-foreground">Income Details</span>
         </div>
      </div>

      {/* FORM FIELDS */}
      <Row gutter={[16, 16]}>
        {/* PAN Card - Premium Design */}
        <Col xs={24} md={12}>
           <div className="flex items-start gap-4 p-4 border border-border rounded-2xl bg-foreground/5 hover:bg-foreground/[0.08] transition-all">
             <div className="flex-1 space-y-1">
               <div className="flex items-center gap-2 mb-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                 <Icon name="CreditCard" size={14} />
                 PAN Details
               </div>
               <Form.Item name="panNumber" style={{ marginBottom: 0 }}>
                  <Input 
                    placeholder="Pan Number" 
                    maxLength={10} 
                    className="bg-transparent border-border rounded-xl placeholder:font-normal"
                  />
               </Form.Item>
             </div>

             <div className="flex-none pt-1">
               <Form.Item name="panCardDocUrl" style={{ marginBottom: 0 }}>
                  <DocumentUpload />
               </Form.Item>
             </div>
           </div>
        </Col>

        {/* ITR Income */}
        <Col xs={24} md={12}>
          <div className="h-full flex items-center p-4 border border-border rounded-2xl bg-foreground/5">
             <div className="w-full">
               <Form.Item 
                  label={<span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Income (as per ITR)</span>}
                  name="totalIncomeITR" 
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    placeholder="Enter Annual Income"
                    min={0}
                    className="w-full bg-transparent border-border rounded-xl placeholder:font-normal"
                    formatter={(value) => formatINRInput(value)}
                    parser={value => parseINRInput(value)}
                  />
               </Form.Item>
             </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default IncomeDetails;
