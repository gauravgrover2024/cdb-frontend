// CUSTOMER_VIEW_MODAL_V2 - FINAL THEME ALIGNMENT
import React from "react";
import { Modal, Row, Col, Tag, Divider } from "antd";
import Icon from "../../components/AppIcon";
import { formatINR } from "../../utils/currency";

const safeText = (v) => (v === undefined || v === null || v === "" ? "—" : String(v));

const InfoRow = ({ icon, label, value, isMono = false }) => (
  <div className="flex gap-3 mb-4 last:mb-0">
    {icon && (
      <div className="mt-0.5 min-w-[20px] text-muted-foreground/60 flex justify-center">
        <Icon name={icon} size={14} />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground/80 font-bold mb-0.5">
        {label}
      </div>
      <div className={`text-[13px] font-semibold text-foreground truncate ${isMono ? 'font-mono' : ''}`}>
        {safeText(value)}
      </div>
    </div>
  </div>
);

const SectionCard = ({ title, icon, children }) => (
  <div className="mb-6 last:mb-0 border border-border/60 bg-foreground/[0.03] rounded-2xl overflow-hidden p-5">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/10">
        <Icon name={icon} size={18} />
      </div>
      <h3 className="text-[12px] font-black text-foreground uppercase tracking-[0.15em]">{title}</h3>
    </div>
    {children}
  </div>
);

const formatDate = (v) => {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString("en-GB", {
       day: '2-digit', 
       month: 'short', 
       year: 'numeric' 
    });
  } catch {
    return String(v);
  }
};

const CustomerViewModal = ({ open, customer, onClose, onEdit }) => {
  if (!customer) return null;

  // 🔀 Normalize field name discrepancies and support both flat and nested reference fields
  const c = {
    ...customer,
    aadhaarNumber: customer.aadhaarNumber || customer.aadharNumber || "",
    secondaryMobile: customer.secondaryMobile || (Array.isArray(customer.extraMobiles) ? customer.extraMobiles[0] : ""),
    // Support nested reference object for API that returns reference1: { name, mobile, ... }
    reference1: customer.reference1 || (customer.reference1_name ? {
      name: customer.reference1_name,
      mobile: customer.reference1_mobile,
      address: customer.reference1_address,
      pincode: customer.reference1_pincode,
      city: customer.reference1_city,
      relation: customer.reference1_relation,
    } : null),
    reference2: customer.reference2 || (customer.reference2_name ? {
      name: customer.reference2_name,
      mobile: customer.reference2_mobile,
      address: customer.reference2_address,
      pincode: customer.reference2_pincode,
      city: customer.reference2_city,
      relation: customer.reference2_relation,
    } : null),
  };

  const kycStatus = c.kycStatus;
  const getKycClasses = (status) => {
    if (status === "Completed") return "bg-green-500/10 text-green-500 border-green-500/20";
    if (status === "In Progress") return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    if (status === "Pending Docs") return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    return "bg-muted text-muted-foreground border-border";
  };

  const createdAtText =
    c.createdAt || c.createdOn
      ? formatDate(c.createdAt || c.createdOn)
      : "";

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1100}
      centered
      destroyOnHidden
      className="theme-modal"
      styles={{ body: { padding: 0 } }}
    >
      {/* 💎 PREMIUM HEADER 💎 */}
      <div className="p-8 border-b border-border/60 bg-card/50 backdrop-blur-xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[24px] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl">
              <Icon name="User" size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-foreground m-0 leading-tight tracking-tight">
                  {c.customerName || "No Name Provided"}
                </h2>
                <Tag className="rounded-full px-2.5 py-0.5 border-none bg-primary/10 text-primary uppercase text-[10px] font-black tracking-widest m-0">
                  {c.customerType || "New"}
                </Tag>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 font-medium">
                {c.customerId && (
                  <div className="flex items-center gap-1.5 text-xs text-primary/80 font-mono">
                    <Icon name="Fingerprint" size={14} />
                    <span>{c.customerId}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon name="Clock" size={14} />
                  <span>Member Since: {createdAtText}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 mr-2">Verification Status</span>
            <Tag className={`rounded-xl px-4 py-1.5 border flex items-center gap-2 uppercase text-[11px] font-black tracking-[0.1em] shadow-sm ${getKycClasses(kycStatus)}`}>
              <Icon name={kycStatus === "Completed" ? "ShieldCheck" : "ShieldAlert"} size={14} />
              {kycStatus || "Not Verified"}
            </Tag>
          </div>
        </div>
      </div>

      {/* 📄 MAIN CONTENT AREA 📄 */}
      <div className="p-8 bg-background max-h-[72vh] overflow-y-auto no-scrollbar">
        <Row gutter={[24, 24]}>
          {/* 🟦 LEFT COLUMN: CORE PROFILE 🟦 */}
          <Col xs={24} lg={16}>
            
            {/* 1. PERSONAL DETAILS */}
            <SectionCard title="Personal Profile" icon="User">
              <Row gutter={[32, 0]}>
                <Col xs={24} md={12}>
                  <InfoRow label="Guardian / Spouse" value={c.sdwOf || c.fatherName} />
                  <InfoRow label="Father's Name" value={c.fatherName} />
                  <InfoRow label="Mother's Name" value={c.motherName} />
                  <InfoRow label="Gender" value={c.gender} />
                  <InfoRow label="Date of Birth" value={formatDate(c.dob)} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoRow label="Marital Status" value={c.maritalStatus} />
                  <InfoRow label="Education" value={c.education} />
                  <InfoRow label="Education (Other)" value={c.educationOther} />
                  <InfoRow label="House Type" value={c.houseType} />
                  <InfoRow label="Address Type" value={c.addressType} />
                  <InfoRow label="Years in current house" value={c.yearsInCurrentHouse} />
                  <InfoRow label="Years in current city" value={c.yearsInCurrentCity} />
                </Col>
              </Row>
              <Divider className="my-5 border-border/40" />
              <div className="bg-foreground/[0.02] p-4 rounded-2xl border border-border/40">
                 <div className="flex items-center gap-3 mb-4">
                    <Icon name="MapPin" size={14} className="text-primary" />
                    <span className="text-[10px] font-black uppercase text-foreground tracking-widest">Residential Address</span>
                 </div>
                 <div className="pl-7">
                    <div className="text-sm font-semibold text-foreground mb-3 leading-relaxed">
                       {c.residenceAddress || "No address provided"}
                    </div>
                    <div className="grid grid-cols-2 gap-6 bg-background/50 p-3 rounded-xl border border-border/30">
                       <InfoRow label="City" value={c.city} />
                       <InfoRow label="State" value={c.state} />
                       <InfoRow label="Pincode" value={c.pincode} isMono />
                    </div>
                 </div>
              </div>

              {c.permanentAddress && (
                <div className="bg-foreground/[0.02] p-4 rounded-2xl border border-border/40 mt-3">
                   <div className="flex items-center gap-3 mb-4">
                      <Icon name="Map" size={14} className="text-primary" />
                      <span className="text-[10px] font-black uppercase text-foreground tracking-widest">Permanent Address</span>
                   </div>
                   <div className="pl-7">
                      <div className="text-sm font-semibold text-foreground mb-3 leading-relaxed">
                         {c.permanentAddress}
                      </div>
                      <div className="grid grid-cols-2 gap-6 bg-background/50 p-3 rounded-xl border border-border/30">
                         <InfoRow label="City" value={c.permanentCity} />
                         <InfoRow label="Pincode" value={c.permanentPincode} isMono />
                      </div>
                   </div>
                </div>
              )}
            </SectionCard>

            {/* 2. EMPLOYMENT & PROFESSIONAL */}
            <SectionCard title="Professional Background" icon="Briefcase">
              <Row gutter={[32, 0]}>
                <Col xs={24} md={12}>
                  <InfoRow label="Occupation Type" value={c.occupationType} />
                  {c.professionalType && <InfoRow label="Profession" value={c.professionalType} />}
                  <InfoRow label="Company/Business" value={c.companyName} />
                  <InfoRow label="Designation" value={c.designation} />
                  <InfoRow label="Office Phone" value={c.companyPhone || c.employmentPhone} isMono />
                </Col>
                <Col xs={24} md={12}>
                  <InfoRow label="Monthly Salary / Income" value={c.salaryMonthly || c.monthlySalary || c.monthlyIncome} />
                  <InfoRow label="Annual Income" value={c.annualIncome || c.itrYears} />
                  <InfoRow label="Total Income (ITR)" value={c.totalIncomeITR ?? c.itrYears} />
                  <InfoRow label="Annual Turnover" value={c.annualTurnover} />
                  <InfoRow label="Net Profit" value={c.netProfit} />
                  <InfoRow label="Other Income" value={c.otherIncome} />
                  <InfoRow label="Other Income Source" value={c.otherIncomeSource} />
                  <InfoRow label="Current Exp (Yrs)" value={c.currentExp} />
                  <InfoRow label="Total Exp (Yrs)" value={c.totalExp} />
                  <InfoRow label="Constitution" value={typeof c.companyType === 'string' ? c.companyType : (Array.isArray(c.companyType) ? c.companyType.join(", ") : "")} />
                  <InfoRow label="Since Year" value={c.incorporationYear} />
                  <InfoRow label="Official Email" value={c.officialEmail} />
                </Col>
              </Row>
              
              <div className="mt-4 p-4 bg-muted/20 rounded-2xl border border-border/40">
                 <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3">Office Address</div>
                 <div className="text-xs font-bold text-foreground mb-2">{c.companyAddress || c.employmentAddress || c.officeAddress || "—"}</div>
                 <div className="flex gap-6 mt-1">
                    <span className="text-xs text-muted-foreground">City: <b className="text-foreground">{c.companyCity || c.employmentCity || "—"}</b></span>
                    <span className="text-xs text-muted-foreground">PIN: <b className="text-foreground font-mono">{c.companyPincode || c.employmentPincode || "—"}</b></span>
                 </div>
              </div>

              <div className="mt-4 flex items-center gap-3 bg-primary/5 p-3 rounded-xl">
                 <span className="text-[9px] font-black uppercase text-primary tracking-tighter">Business Nature:</span>
                 <div className="flex flex-wrap gap-2">
                    {(() => {
                      const businessNature = typeof c.businessNature === 'string' 
                        ? c.businessNature.split(',').map(s => s.trim()).filter(Boolean)
                        : Array.isArray(c.businessNature) ? c.businessNature : [];
                      
                      return businessNature.length > 0 ? (
                        businessNature.map((tag, i) => (
                          <Tag key={i} className="m-0 bg-background border-primary/20 text-primary text-[10px] font-bold px-2 py-0 rounded">
                             {tag}
                          </Tag>
                        ))
                      ) : <span className="text-[10px] text-muted-foreground">Not specified</span>;
                    })()}
                 </div>
              </div>
            </SectionCard>

            {/* 3. SOURCING & LEAD DETAILS */}
            <SectionCard title="Sourcing & Lead Details" icon="Zap">
              <Row gutter={[32, 0]}>
                <Col xs={24} md={12}>
                  <InfoRow label="Sourcing Channel" value={c.sourcingChannel || c.source} />
                  <InfoRow label="Lead Source" value={c.leadSource || c.source} />
                  <InfoRow label="Lead Date" value={formatDate(c.leadDate)} />
                  <InfoRow label="Lead Status" value={c.leadType} />
                </Col>
                <Col xs={24} md={12}>
                  <InfoRow label="Source Name" value={c.sourceName} />
                  <InfoRow label="Dealer / Showroom" value={c.dealerName} />
                  <InfoRow label="Sales Executive" value={c.salesExecutive} />
                  <InfoRow label="Payout Applicable" value={c.payoutApplicable} />
                </Col>
              </Row>
              {c.sourceDetails && (
                <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="text-[10px] font-black uppercase text-primary/70 tracking-widest mb-2">Source Details</div>
                  <div className="text-xs font-semibold text-foreground">{c.sourceDetails}</div>
                </div>
              )}
            </SectionCard>

            {/* 4. REFERENCES */}
            <SectionCard title="Verification References" icon="Users">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Ref 1 */}
                  <div className="bg-foreground/[0.04] p-5 rounded-2xl border border-border/50 hover:border-primary/20 transition-all">
                     <div className="flex items-center justify-between mb-4">
                        <Tag className="m-0 bg-primary/10 text-primary border-none text-[9px] font-black px-2 py-0.5 rounded-full">PRIMARY</Tag>
                        <Icon name="UserCheck" size={14} className="text-primary/40" />
                     </div>
                     <InfoRow label="Referrer Name" value={c?.reference1?.name || c.reference1_name} />
                     <InfoRow label="Mobile Number" value={c?.reference1?.mobile || c.reference1_mobile} isMono />
                     <InfoRow label="Address" value={c?.reference1?.address || c.reference1_address} />
                     <InfoRow label="Relation" value={c?.reference1?.relation || c.reference1_relation} />
                     <InfoRow label="City / Pincode" value={[c?.reference1?.city || c.reference1_city, c?.reference1?.pincode || c.reference1_pincode].filter(Boolean).join(" • ")} />
                  </div>
                  {/* Ref 2 */}
                  <div className="bg-foreground/[0.04] p-5 rounded-2xl border border-border/50 hover:border-primary/20 transition-all">
                     <div className="flex items-center justify-between mb-4">
                        <Tag className="m-0 bg-muted text-muted-foreground border-none text-[9px] font-black px-2 py-0.5 rounded-full">SECONDARY</Tag>
                        <Icon name="UserCheck" size={14} className="text-muted-foreground/40" />
                     </div>
                     <InfoRow label="Referrer Name" value={c?.reference2?.name || c.reference2_name} />
                     <InfoRow label="Mobile Number" value={c?.reference2?.mobile || c.reference2_mobile} isMono />
                     <InfoRow label="Address" value={c?.reference2?.address || c.reference2_address} />
                     <InfoRow label="Relation" value={c?.reference2?.relation || c.reference2_relation} />
                     <InfoRow label="City / Pincode" value={[c?.reference2?.city || c.reference2_city, c?.reference2?.pincode || c.reference2_pincode].filter(Boolean).join(" • ")} />
                  </div>
               </div>
            </SectionCard>
          </Col>

          {/* 🟧 RIGHT COLUMN: BANKING & CONTACT 🟧 */}
          <Col xs={24} lg={8}>
            
            {/* 4. CONTACT CHANNELS */}
            <SectionCard title="Contact Channels" icon="Phone">
              <InfoRow icon="Smartphone" label="Primary Mobile" value={c.primaryMobile} isMono />
              <InfoRow icon="MessageCircle" label="WhatsApp" value={c.whatsappNumber} isMono />
              <InfoRow icon="Mail" label="Email Address" value={c.email || c.emailAddress} />
              
              <div className="mt-5 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                 <div className="text-[9px] font-black uppercase text-primary/70 tracking-[0.2em] mb-3">Backup Numbers</div>
                 <div className="flex flex-wrap gap-2">
                    {Array.isArray(c.extraMobiles) && c.extraMobiles.length > 0 ? (
                      c.extraMobiles.map((num, i) => (
                        <div key={i} className="bg-background border border-primary/10 text-foreground text-[11px] font-bold font-mono px-3 py-1 rounded-lg shadow-sm">
                          {num}
                        </div>
                      ))
                    ) : <span className="text-[11px] text-muted-foreground/60 italic">No alternative contacts</span>}
                 </div>
              </div>
            </SectionCard>

            {/* 5. BANKING REPOSITORY */}
            <SectionCard title="Banking Details" icon="Building2">
               <div className="space-y-5">
                  <InfoRow icon="Building" label="Preferred Bank" value={c.bankName} />
                  <div className="p-3 bg-background/50 rounded-xl border border-border/40">
                     <InfoRow icon="CreditCard" label="Account Number" value={c.accountNumber} isMono />
                     <div className="flex items-center gap-2 mt-2 px-2 py-0.5 bg-muted rounded text-[10px] font-bold text-muted-foreground">
                        {c.accountType || "Savings"}
                     </div>
                  </div>
                  <Row gutter={12}>
                     <Col span={12}><InfoRow label="IFSC Code" value={c.ifscCode || c.ifsc} isMono /></Col>
                     <Col span={12}><InfoRow label="Account Since (Years)" value={c.accountSinceYears} /></Col>
                  </Row>
                  <InfoRow label="Branch Location" value={c.branch} />
               </div>
            </SectionCard>

            {/* 6. NOMINEE & LEGAL */}
            <SectionCard title="Nominee / KYC" icon="Shield">
               <div className="mb-5 pb-5 border-b border-border/40">
                  <span className="text-[9px] font-black uppercase text-pink-500 tracking-[0.2em] block mb-4">Nominee Details</span>
                  <InfoRow label="Full Name" value={c.nomineeName} />
                  <InfoRow label="Relationship" value={c.nomineeRelation} />
                  <InfoRow label="Date of Birth" value={formatDate(c.nomineeDob)} />
               </div>
               
               <span className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.2em] block mb-4">Identity Proofs</span>
               <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-background hover:bg-muted/30 rounded-xl border border-border/40 transition-all cursor-default">
                     <div className="flex items-center gap-3">
                        <Icon name="CreditCard" className="text-indigo-400" size={16} />
                        <span className="text-[11px] font-bold text-muted-foreground">PAN ID</span>
                     </div>
                     <span className="text-xs font-black text-foreground font-mono tracking-wider">{c.panNumber || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-background hover:bg-muted/30 rounded-xl border border-border/40 transition-all cursor-default">
                     <div className="flex items-center gap-3">
                        <Icon name="IdCard" className="text-indigo-400" size={16} />
                        <span className="text-[11px] font-bold text-muted-foreground">AADHAAR</span>
                     </div>
                     <span className="text-xs font-black text-foreground font-mono tracking-wider">{c.aadhaarNumber || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-background hover:bg-muted/30 rounded-xl border border-border/40 transition-all cursor-default">
                     <div className="flex items-center gap-3">
                        <Icon name="Globe" className="text-indigo-400" size={16} />
                        <span className="text-[11px] font-bold text-muted-foreground">PASSPORT</span>
                     </div>
                     <span className="text-xs font-black text-foreground font-mono tracking-wider">{c.passportNumber || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-background hover:bg-muted/30 rounded-xl border border-border/40 transition-all cursor-default">
                     <div className="flex items-center gap-3">
                        <Icon name="Vote" className="text-indigo-400" size={16} />
                        <span className="text-[11px] font-bold text-muted-foreground">VOTER ID</span>
                     </div>
                     <span className="text-xs font-black text-foreground font-mono tracking-wider">{c.voterId || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-background hover:bg-muted/30 rounded-xl border border-border/40 transition-all cursor-default">
                     <div className="flex items-center gap-3">
                        <Icon name="Car" className="text-indigo-400" size={16} />
                        <span className="text-[11px] font-bold text-muted-foreground">DRIVING LICENCE</span>
                     </div>
                     <span className="text-xs font-black text-foreground font-mono tracking-wider">{c.dlNumber || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-background hover:bg-muted/30 rounded-xl border border-border/40 transition-all cursor-default">
                     <div className="flex items-center gap-3">
                        <Icon name="FileText" className="text-indigo-400" size={16} />
                        <span className="text-[11px] font-bold text-muted-foreground">GST NUMBER</span>
                     </div>
                     <span className="text-xs font-black text-foreground font-mono tracking-wider">{c.gstNumber || "—"}</span>
                  </div>
               </div>

               {(c.identityProofType || c.addressProofType) && (
                 <>
                   <span className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.2em] block mb-4 mt-5">Selected Proofs</span>
                   <div className="space-y-4">
                      {c.identityProofType && (
                        <>
                          <div className="flex items-center justify-between p-3 bg-background hover:bg-muted/30 rounded-xl border border-border/40 transition-all cursor-default">
                             <div className="flex items-center gap-3">
                                <Icon name="FileCheck" className="text-indigo-400" size={16} />
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-muted-foreground">IDENTITY PROOF</span>
                                  <span className="text-[10px] text-muted-foreground/70">{c.identityProofType.replace(/_/g, " ")}</span>
                                </div>
                             </div>
                             <span className="text-xs font-black text-foreground font-mono tracking-wider">{c.identityProofNumber || "—"}</span>
                          </div>
                          {c.identityProofExpiry && (
                               <div className="ml-10 text-[10px] text-muted-foreground mt-[-10px] mb-2 font-mono">
                                  Expires: {formatDate(c.identityProofExpiry)}
                               </div>
                          )}
                        </>
                      )}
                      
                      {c.addressProofType && (
                        <div className="flex items-center justify-between p-3 bg-background hover:bg-muted/30 rounded-xl border border-border/40 transition-all cursor-default">
                           <div className="flex items-center gap-3">
                              <Icon name="FileText" className="text-indigo-400" size={16} />
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-muted-foreground">ADDRESS PROOF</span>
                                <span className="text-[10px] text-muted-foreground/70">{c.addressProofType.replace(/_/g, " ")}</span>
                              </div>
                           </div>
                           <span className="text-xs font-black text-foreground font-mono tracking-wider">{c.addressProofNumber || "—"}</span>
                        </div>
                      )}
                   </div>
                 </>
               )}

               {(c.typeOfLoan || c.financeExpectation != null || c.loanTenureMonths != null) && (
                 <>
                   <span className="text-[9px] font-black uppercase text-emerald-600 tracking-[0.2em] block mb-4 mt-5">Loan Preference</span>
                   <div className="space-y-3">
                     {c.typeOfLoan && <InfoRow label="Type of Loan" value={c.typeOfLoan} />}
                     {c.financeExpectation != null && c.financeExpectation !== "" && <InfoRow label="Finance Expectation" value={formatINR(c.financeExpectation)} isMono />}
                     {c.loanTenureMonths != null && c.loanTenureMonths !== "" && <InfoRow label="Tenure (Months)" value={c.loanTenureMonths} isMono />}
                   </div>
                 </>
               )}

               {c.loan_notes && (
                 <>
                   <span className="text-[9px] font-black uppercase text-amber-600 tracking-[0.2em] block mb-4 mt-5">Notes</span>
                   <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 text-xs font-medium text-foreground whitespace-pre-wrap">{c.loan_notes}</div>
                 </>
               )}

               {(c.panCardDocUrl || c.aadhaarCardDocUrl || c.passportDocUrl || c.dlDocUrl || c.gstDocUrl || c.addressProofDocUrl) && (
                 <>
                   <span className="text-[9px] font-black uppercase text-sky-600 tracking-[0.2em] block mb-4 mt-5">Document Links</span>
                   <div className="space-y-2">
                     {c.panCardDocUrl && <div className="flex items-center gap-2 text-xs"><Icon name="FileCheck" size={12} /> <a href={c.panCardDocUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">PAN Card</a></div>}
                     {c.aadhaarCardDocUrl && <div className="flex items-center gap-2 text-xs"><Icon name="FileCheck" size={12} /> <a href={c.aadhaarCardDocUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">Aadhaar</a></div>}
                     {c.passportDocUrl && <div className="flex items-center gap-2 text-xs"><Icon name="FileCheck" size={12} /> <a href={c.passportDocUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">Passport</a></div>}
                     {c.dlDocUrl && <div className="flex items-center gap-2 text-xs"><Icon name="FileCheck" size={12} /> <a href={c.dlDocUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">Driving Licence</a></div>}
                     {c.gstDocUrl && <div className="flex items-center gap-2 text-xs"><Icon name="FileCheck" size={12} /> <a href={c.gstDocUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">GST</a></div>}
                     {c.addressProofDocUrl && <div className="flex items-center gap-2 text-xs"><Icon name="FileCheck" size={12} /> <a href={c.addressProofDocUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">Address Proof</a></div>}
                   </div>
                 </>
               )}
            </SectionCard>
          </Col>
        </Row>

        {/* 🔗 LINKED LOANS SECTION - Shows all loans with synced customer data 🔗 */}
        {Array.isArray(c?.linkedLoans) && c.linkedLoans.length > 0 && (
          <div className="mt-8 pt-8 border-t border-border/60">
            <SectionCard title={`Linked Loans (${c.linkedLoans.length})`} icon="Zap">
              <div className="space-y-4">
                {c.linkedLoans.map((loan) => (
                  <div key={loan._id} className="p-5 bg-background/50 rounded-xl border border-border/40 hover:border-primary/20 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="font-bold text-foreground text-sm mb-1">
                          Loan ID: <span className="font-mono text-primary">{loan.loanId || '—'}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {loan.vehicleModel || loan.loanType || 'Loan'}
                        </div>
                      </div>
                      <Tag className={`m-0 border-none text-xs font-bold px-3 py-1 rounded-full ${
                        loan.status === 'Approved' ? 'bg-green-500/10 text-green-600' :
                        loan.status === 'Pending' ? 'bg-blue-500/10 text-blue-600' :
                        loan.status === 'Rejected' ? 'bg-red-500/10 text-red-600' :
                        'bg-amber-500/10 text-amber-600'
                      }`}>
                        {loan.status || 'Unknown'}
                      </Tag>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      <div className="p-2 bg-background rounded-lg border border-border/30">
                        <div className="text-muted-foreground/70 font-semibold uppercase tracking-widest text-[9px] mb-1">Loan Amount</div>
                        <div className="font-bold text-foreground font-mono">{formatINR(loan.loanAmount)}</div>
                      </div>
                      <div className="p-2 bg-background rounded-lg border border-border/30">
                        <div className="text-muted-foreground/70 font-semibold uppercase tracking-widest text-[9px] mb-1">Tenure</div>
                        <div className="font-bold text-foreground font-mono">{loan.tenure ? `${loan.tenure} months` : '—'}</div>
                      </div>
                      <div className="p-2 bg-background rounded-lg border border-border/30">
                        <div className="text-muted-foreground/70 font-semibold uppercase tracking-widest text-[9px] mb-1">Stage</div>
                        <div className="font-bold text-foreground text-xs">{loan.currentStage || loan.loanType || '—'}</div>
                      </div>
                      <div className="p-2 bg-background rounded-lg border border-border/30">
                        <div className="text-muted-foreground/70 font-semibold uppercase tracking-widest text-[9px] mb-1">Type</div>
                        <div className="font-bold text-foreground text-xs">{loan.loanType || '—'}</div>
                      </div>
                      <div className="p-2 bg-background rounded-lg border border-border/30">
                        <div className="text-muted-foreground/70 font-semibold uppercase tracking-widest text-[9px] mb-1">Created</div>
                        <div className="font-bold text-foreground text-xs">{formatDate(loan.createdAt)}</div>
                      </div>
                      {loan.approval_loanAmountApproved && (
                        <div className="p-2 bg-background rounded-lg border border-border/30">
                          <div className="text-muted-foreground/70 font-semibold uppercase tracking-widest text-[9px] mb-1">Approved</div>
                          <div className="font-bold text-foreground font-mono text-xs">{formatINR(loan.approval_loanAmountApproved)}</div>
                        </div>
                      )}
                    </div>

                    {/* Synced Customer Data Indicator */}
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
                        <Icon name="CheckCircle2" size={12} className="text-success" />
                        <span>Customer data synced to this loan</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}
        
        {(!c?.linkedLoans || c.linkedLoans.length === 0) && (
          <div className="mt-8 pt-8 border-t border-border/60 text-center py-8">
            <Icon name="Zap" size={32} className="text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No linked loans found for this customer</p>
          </div>
        )}
      </div>

      {/* 🏁 ACTION FOOTER 🏁 */}
      <div className="p-6 border-t border-border/60 bg-card rounded-b-[inherit] flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div className="text-xs text-muted-foreground italic">
            Visual profile summary generated for administrative review.
         </div>
         <div className="flex items-center gap-3">
            <button
               onClick={onClose}
               className="px-8 py-2.5 rounded-xl border border-border bg-background text-sm font-bold text-foreground hover:bg-muted transition-all active:scale-95"
            >
               Close
            </button>
            <button
               onClick={() => (onEdit ? onEdit() : null)}
               className="px-8 py-2.5 rounded-xl bg-success text-white text-sm font-black shadow-xl shadow-success/20 hover:brightness-110 transition-all active:scale-95 flex items-center gap-2"
            >
               <Icon name="Edit3" size={16} />
               Modify Profile
            </button>
         </div>
      </div>
    </Modal>
  );
};

export default CustomerViewModal;
