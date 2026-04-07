import { Col, Form, Input, Row } from "antd";
import Icon from "../../../components/AppIcon";
import DocumentUpload from "../../../components/ui/DocumentUpload";

const UploadSlot = ({ name, uploadTitle, viewerTitle, docTag, label }) => (
  <Form.Item name={name} style={{ marginBottom: 0 }}>
    <div className="space-y-1">
      <DocumentUpload
        uploadTitle={uploadTitle}
        viewerTitle={viewerTitle}
        docTag={docTag}
      />
      <div className="max-w-24 text-center text-[10px] font-medium text-muted-foreground">
        {label}
      </div>
    </div>
  </Form.Item>
);

const KycItem = ({
  label,
  icon,
  nameInput,
  nameDoc,
  placeholder,
  maxLength,
  styleInput,
  extraUploads = [],
  primaryDocTag,
}) => (
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
        <div className="flex flex-wrap justify-end gap-3">
          <UploadSlot
            name={nameDoc}
            uploadTitle={`Upload ${label}`}
            viewerTitle="Post-File Document Viewer"
            docTag={primaryDocTag || label}
            label={primaryDocTag || label}
          />
          {extraUploads.map((upload) => (
            <UploadSlot
              key={upload.name}
              name={upload.name}
              uploadTitle={upload.uploadTitle}
              viewerTitle={upload.viewerTitle || "Post-File Document Viewer"}
              docTag={upload.docTag}
              label={upload.label || upload.docTag}
            />
          ))}
        </div>
      </div>
    </div>
  </Col>
);

const KycDetails = () => {
  const form = Form.useFormInstance();
  const isFinanced = Form.useWatch("isFinanced", form);
  const applicantType = Form.useWatch("applicantType", form);
  const isCompany = applicantType === "Company";

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
        {!isCompany && (
          <KycItem
            label="Aadhaar Card"
            icon="IdCard"
            nameInput="aadhaarNumber"
            nameDoc="aadhaarCardDocUrl"
            placeholder="12-Digit Aadhaar No"
            maxLength={12}
            primaryDocTag="Aadhar Front"
            extraUploads={[
              {
                name: "aadhaarCardBackDocUrl",
                uploadTitle: "Upload Aadhaar Back",
                docTag: "Aadhar Back",
              },
            ]}
          />
        )}

        {!isCompany && (
          <KycItem
            label="Passport"
            icon="Globe"
            nameInput="passportNumber"
            nameDoc="passportDocUrl"
            placeholder="Passport Number"
            maxLength={20}
            styleInput={{ textTransform: "" }}
          />
        )}

        <KycItem
          label="GST Certificate"
          icon="Building"
          nameInput="gstNumber"
          nameDoc="gstDocUrl"
          placeholder="GST Number"
          maxLength={15}
          styleInput={{ textTransform: "" }}
          primaryDocTag="GST Page 1"
          extraUploads={[
            {
              name: "gstDocUrlPage2",
              uploadTitle: "Upload GST Page 2",
              docTag: "GST Page 2",
            },
            {
              name: "gstDocUrlPage3",
              uploadTitle: "Upload GST Page 3",
              docTag: "GST Page 3",
            },
          ]}
        />

        {!isCompany && (
          <KycItem
            label="Driving License"
            icon="Car"
            nameInput="dlNumber"
            nameDoc="dlDocUrl"
            placeholder="DL Number"
            maxLength={20}
            styleInput={{ textTransform: "" }}
          />
        )}
      </Row>
    </div>
  );
};

export default KycDetails;
