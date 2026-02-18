import { Col, Form, Input, Row } from "antd";
import Icon from "../../../components/AppIcon";
import DocumentUpload from "../../../components/ui/DocumentUpload";

const KycItem = ({ label, icon, nameInput, nameDoc, placeholder, maxLength, styleInput }) => (
  <Col xs={24} md={12} lg={12}>
    <div className="flex items-start gap-4 p-4 border border-border rounded-2xl bg-foreground/5 hover:bg-foreground/[0.08] transition-all">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 mb-2 text-muted-foreground text-[10px] font-normal uppercase tracking-widest">
          <Icon name={icon} size={14} />
          <span className="font-normal">{label}</span>
        </div>
        <Form.Item name={nameInput} style={{ marginBottom: 0 }}>
          <Input
            placeholder={placeholder}
            maxLength={maxLength}
            className="bg-transparent border-border rounded-xl placeholder:font-normal font-normal"
            style={{ ...styleInput }}
          />
        </Form.Item>
      </div>

      <div className="flex-none pt-1">
        <Form.Item name={nameDoc} style={{ marginBottom: 0 }}>
          <span className="font-normal"><DocumentUpload /></span>
        </Form.Item>
      </div>
    </div>
  </Col>
);

const KycDetails = () => {
  const form = Form.useFormInstance();
  const isFinanced = Form.useWatch("isFinanced", form);

  // Show in customer module & financed loans
  const showKyc = isFinanced !== "No";

  if (!showKyc) {
    return null;
  }

  return (
    <div
      id="section-kyc"
      className="form-section bg-card border border-border/50 rounded-2xl p-6 shadow-sm mb-6"
      style={{ background: "var(--card)" }}
    >
      {/* SECTION HEADER */}
      <div className="section-header mb-6 flex justify-between items-center">
        <div className="section-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Icon name="ShieldCheck" size={20} />
          </div>
          <span className="text-lg font-bold text-foreground">KYC Documents</span>
        </div>
      </div>

      {/* FORM FIELDS */}
      <Row gutter={[16, 16]}>
        <KycItem
          label="Aadhaar Card"
          icon="IdCard"
          nameInput="aadhaarNumber"
          nameDoc="aadhaarCardDocUrl"
          placeholder="12-Digit Aadhaar No"
          maxLength={12}
        />

        <KycItem
          label="Passport"
          icon="Globe"
          nameInput="passportNumber"
          nameDoc="passportDocUrl"
          placeholder="Passport Number"
          maxLength={20}
          styleInput={{ textTransform: '' }}
        />

        <KycItem
          label="GST Certificate"
          icon="Building"
          nameInput="gstNumber"
          nameDoc="gstDocUrl"
          placeholder="GST Number"
          maxLength={15}
          styleInput={{ textTransform: '' }}
        />

        <KycItem
          label="Driving License"
          icon="Car"
          nameInput="dlNumber"
          nameDoc="dlDocUrl"
          placeholder="DL Number"
          maxLength={20}
          styleInput={{ textTransform: '' }}
        />
      </Row>
    </div>
  );
};

export default KycDetails;
