import React, { useState } from "react";
import { Form, Select, Input, DatePicker, InputNumber, Radio, Tooltip, Upload, message } from "antd";
import Icon from "../../../../../components/AppIcon";
import Button from "../../../../../components/ui/Button";
import { formatINR, formatINRInput, parseINRInput } from "../../../../../utils/currency";

const { Option } = Select;

// Image Upload Component
const ImageUpload = ({ value, onChange, label = "Upload Image" }) => {
  const [imageUrl, setImageUrl] = useState(value);

  const handleChange = (info) => {
    if (info.file.status === 'uploading') {
      return;
    }
    if (info.file.status === 'done') {
      // Get this url from response in real world
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const url = reader.result;
        setImageUrl(url);
        onChange?.(url);
      });
      reader.readAsDataURL(info.file.originFileObj);
    }
  };

  const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('You can only upload image files!');
      return false;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Image must be smaller than 5MB!');
      return false;
    }
    return false; // Prevent auto upload, handle manually
  };

  const uploadButton = (
    <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-xl hover:border-primary transition-colors cursor-pointer bg-muted/30 hover:bg-primary/5">
      <Icon name={imageUrl ? "CheckCircle2" : "Upload"} size={24} className={imageUrl ? "text-success mb-2" : "text-muted-foreground mb-2"} />
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        {imageUrl ? "Image Uploaded" : label}
      </span>
    </div>
  );

  return (
    <Upload
      name="image"
      listType="picture-card"
      className="instrument-image-uploader"
      showUploadList={false}
      beforeUpload={beforeUpload}
      onChange={handleChange}
      customRequest={({ file, onSuccess }) => {
        setTimeout(() => {
          onSuccess("ok");
        }, 0);
      }}
    >
      {imageUrl ? (
        <div className="relative w-full h-full group">
          <img src={imageUrl} alt="instrument" className="w-full h-full object-cover rounded-lg" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold uppercase tracking-wider">Change Image</span>
          </div>
        </div>
      ) : (
        uploadButton
      )}
    </Upload>
  );
};

const ChequeHeader = ({ id, index, isExpanded, onToggle, onDelete, onCopy, isFirst, form }) => {
  const number = Form.useWatch(`cheque_${id}_number`, form);
  const amount = Form.useWatch(`cheque_${id}_amount`, form);

  return (
    <div
      className={`p-3 cursor-pointer flex items-center justify-between transition-colors ${
        isExpanded ? "bg-primary/5 border-b border-border" : "bg-muted/30 hover:bg-muted/50"
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Icon name={isExpanded ? "ChevronDown" : "ChevronRight"} size={18} className="text-primary" />
        <div className="flex items-center gap-2">
           <span className="font-bold text-sm">Cheque {index + 1}</span>
           {!isExpanded && (Number(amount) > 0 || number) && (
             <div className="flex items-center gap-2 h-5">
               <div className="w-[1px] h-3 bg-border" />
               <div className="flex gap-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                 {number && <span className="flex items-center gap-1"><Icon name="Hash" size={10} className="text-primary" />{number}</span>}
                 {amount && <span className="flex items-center gap-1 text-primary"><Icon name="IndianRupee" size={10} className="text-primary" />{formatINR(amount).replace(/^₹\s?/, "")}</span>}
               </div>
             </div>
           )}
        </div>
      </div>

      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {!isFirst && (
          <Tooltip title="Copy details from first cheque">
            <button
              onClick={onCopy}
              className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
            >
              Copy 1st
            </button>
          </Tooltip>
        )}
        <button
          onClick={onDelete}
          className="p-1.5 text-muted-foreground hover:text-error hover:bg-error/10 rounded-lg transition-colors"
        >
          <Icon name="Trash2" size={14} className="text-destructive" />
        </button>
      </div>
    </div>
  );
};

const PostFileInstrumentDetails = ({ form }) => {
  const instrumentType = Form.useWatch("instrumentType", form);
  const [cheques, setCheques] = useState([{ id: 1 }]);
  const [expandedCheque, setExpandedCheque] = useState(1);

  // Sync initialization
  React.useEffect(() => {
    const existing = [];
    for (let i = 1; i <= 20; i++) {
      if (form.getFieldValue(`cheque_${i}_number`)) {
        existing.push({ id: i });
      }
    }
    if (existing.length > 0) {
      setCheques(existing);
      setExpandedCheque(existing[0].id);
    }
  }, [form]);

  // Calculate Total Cheque Amount
  const totalAmount = React.useMemo(() => {
    if (instrumentType !== "Cheque") return 0;
    return cheques.reduce((sum, c) => {
      const val = form.getFieldValue(`cheque_${c.id}_amount`);
      return sum + (Number(val) || 0);
    }, 0);
  }, [cheques, instrumentType, form]);

  const addCheque = () => {
    const newId = Math.max(...cheques.map((c) => c.id), 0) + 1;
    setCheques([...cheques, { id: newId }]);
    setExpandedCheque(newId);
  };

  const deleteCheque = (id) => {
    if (cheques.length > 1) {
      setCheques(cheques.filter((c) => c.id !== id));
      const fields = ["number", "bankName", "accountNumber", "date", "amount", "tag", "favouring", "signedBy"];
      const updates = {};
      fields.forEach(f => {
        updates[`cheque_${id}_${f}`] = undefined;
      });
      form.setFieldsValue(updates);
    }
  };

  const copyCheque = (fromId, toId) => {
    const fields = ["bankName", "accountNumber", "date", "amount", "tag", "favouring", "signedBy"];
    const values = {};
    fields.forEach((f) => {
      values[`cheque_${toId}_${f}`] = form.getFieldValue(`cheque_${fromId}_${f}`);
    });
    form.setFieldsValue(values);
  };

  return (
    <div className="bg-card rounded-xl shadow-lg border border-border/50 p-6 h-full flex flex-col hover:shadow-xl transition-shadow duration-300">
      {/* header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <Icon name="FileText" size={22} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Instrument Details
          </h2>
          <p className="text-sm text-muted-foreground">
            EMI deduction method configuration
          </p>
        </div>
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto space-y-4 md:space-y-6 text-sm">
        {/* Instrument Type Selector */}
        <div className="bg-foreground/5 rounded-2xl p-4 border border-border">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">
            Payment Mode
          </h3>

          <Form.Item name="instrumentType" noStyle>
            <Radio.Group 
              className="w-full"
              onChange={(e) => form.setFieldsValue({ instrumentType: e.target.value })}
            >
              <div className="grid grid-cols-3 gap-3">
                {["Cheque", "ECS", "SI"].map((type) => (
                  <Radio.Button 
                    key={type}
                    value={type}
                    className={`h-12 flex items-center justify-center rounded-xl border-border !bg-transparent text-sm font-bold transition-all hover:border-primary/50 ${
                      instrumentType === type ? "!border-primary !text-primary !bg-primary/5" : "text-muted-foreground"
                    }`}
                  >
                    <div className="flex flex-col items-center">
                       <Icon name={type === "Cheque" ? "CreditCard" : type === "ECS" ? "Zap" : "RefreshCw"} size={16} className="mb-1 text-primary" />
                       <span className="text-[10px] uppercase tracking-wider">{type}</span>
                    </div>
                  </Radio.Button>
                ))}
              </div>
            </Radio.Group>
          </Form.Item>
        </div>

        {/* Cheque Section */}
        {instrumentType === "Cheque" && (
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Cheque Configuration</h3>
                <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                   <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                     Total: {formatINR(totalAmount)}
                   </span>
                </div>
             </div>

            <div className="space-y-3">
              {cheques.map((cheque, index) => (
                <div
                  key={cheque.id}
                  className={`border rounded-2xl overflow-hidden transition-all ${
                    expandedCheque === cheque.id ? "border-primary/30 shadow-lg shadow-primary/5" : "border-border"
                  }`}
                >
                  <ChequeHeader
                    id={cheque.id}
                    index={index}
                    isExpanded={expandedCheque === cheque.id}
                    onToggle={() => setExpandedCheque(expandedCheque === cheque.id ? null : cheque.id)}
                    onDelete={() => deleteCheque(cheque.id)}
                    onCopy={() => copyCheque(cheques[0].id, cheque.id)}
                    isFirst={index === 0}
                    form={form}
                  />

                  {expandedCheque === cheque.id && (
                    <div className="p-4 bg-card/50 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Form.Item label="Cheque No" name={`cheque_${cheque.id}_number`} className="mb-0">
                          <Input placeholder="6-digit No" maxLength={6} className="bg-background border-border font-bold h-10" />
                        </Form.Item>

                        <Form.Item label="Bank Name" name={`cheque_${cheque.id}_bankName`} className="mb-0">
                          <Input placeholder="e.g. HDFC Bank" className="bg-background border-border font-bold h-10" />
                        </Form.Item>

                        <Form.Item label="Acc Number" name={`cheque_${cheque.id}_accountNumber`} className="mb-0">
                          <Input placeholder="Acc No" className="bg-background border-border font-bold h-10" />
                        </Form.Item>

                        <Form.Item label="Cheque Date" name={`cheque_${cheque.id}_date`} className="mb-0">
                          <DatePicker className="w-full bg-background border-border font-bold h-10" format="DD-MM-YYYY" />
                        </Form.Item>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Form.Item label="Amount" name={`cheque_${cheque.id}_amount`} className="mb-0">
                          <InputNumber 
                            className="w-full bg-background border-border font-bold h-10" 
                            placeholder="₹ 0"
                            formatter={value => formatINRInput(value)}
                            parser={value => parseINRInput(value)}
                          />
                        </Form.Item>

                        <Form.Item label="Purpose / Tag" name={`cheque_${cheque.id}_tag`} className="mb-0">
                          <Input placeholder="e.g. Security, EMI" className="bg-background border-border font-bold h-10" />
                        </Form.Item>

                        <Form.Item label="Favouring" name={`cheque_${cheque.id}_favouring`} className="mb-0">
                           <Input placeholder="Beneficiary Name" className="bg-background border-border font-bold h-10" />
                        </Form.Item>

                        <Form.Item label="Signed By" name={`cheque_${cheque.id}_signedBy`} className="mb-0">
                          <Select className="w-full font-bold h-10" placeholder="Select Entity">
                            <Option value="Applicant">Applicant</Option>
                            <Option value="Co-applicant">Co-applicant</Option>
                            <Option value="Guarantor">Guarantor</Option>
                          </Select>
                        </Form.Item>
                      </div>

                      {/* Cheque Image Upload */}
                      <div className="mt-4 p-4 bg-foreground/5 rounded-xl border border-border">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon name="Image" size={16} className="text-primary" />
                          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Document Verification</span>
                        </div>
                        <Form.Item name={`cheque_${cheque.id}_image`} className="mb-0">
                          <ImageUpload label="Upload Cheque Image" />
                        </Form.Item>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button onClick={addCheque} variant="outline" className="w-full border-dashed border-2 py-6 rounded-2xl hover:border-primary hover:text-primary transition-all group">
              <div className="flex flex-col items-center">
                 <Icon name="Plus" size={20} className="mb-1 text-primary group-hover:scale-110 transition-transform" />
                 <span className="text-xs font-bold uppercase tracking-widest">Add Another Instrument</span>
              </div>
            </Button>
          </div>
        )}

        {/* ECS Section */}
        {instrumentType === "ECS" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground">ECS / NACH Configuration</h3>

            <div className="bg-foreground/5 rounded-2xl border border-border p-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Form.Item label="MICR Code" name="ecs_micrCode" className="mb-0">
                  <Input placeholder="9-digit MICR" maxLength={9} className="bg-background border-border font-bold h-10" />
                </Form.Item>

                <Form.Item label="Bank Name" name="ecs_bankName" className="mb-0">
                  <Input placeholder="e.g. HDFC Bank" className="bg-background border-border font-bold h-10" />
                </Form.Item>

                <Form.Item label="Acc Number" name="ecs_accountNumber" className="mb-0">
                  <Input placeholder="Acc No" className="bg-background border-border font-bold h-10" />
                </Form.Item>

                <Form.Item label="Start Date" name="ecs_date" className="mb-0">
                  <DatePicker className="w-full bg-background border-border font-bold h-10" format="DD-MM-YYYY" />
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Form.Item label="Max Amount" name="ecs_amount" className="mb-0">
                   <InputNumber 
                    className="w-full bg-background border-border font-bold h-10" 
                    placeholder="₹ 0"
                    formatter={value => formatINRInput(value)}
                    parser={value => parseINRInput(value)}
                  />
                </Form.Item>

                <Form.Item label="Type / Tag" name="ecs_tag" className="mb-0">
                  <Input placeholder="e.g. EMI Mandate" className="bg-background border-border font-bold h-10" />
                </Form.Item>

                <Form.Item label="Favouring" name="ecs_favouring" className="mb-0">
                  <Input placeholder="Beneficiary Name" className="bg-background border-border font-bold h-10" />
                </Form.Item>

                <Form.Item label="Signed By" name="ecs_signedBy" className="mb-0">
                   <Select className="w-full font-bold h-10" placeholder="Select Entity">
                    <Option value="Applicant">Applicant</Option>
                    <Option value="Co-applicant">Co-applicant</Option>
                    <Option value="Guarantor">Guarantor</Option>
                  </Select>
                </Form.Item>
              </div>

              {/* ECS Document Upload */}
              <div className="mt-4 p-4 bg-foreground/5 rounded-xl border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="Image" size={16} className="text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Document Verification</span>
                </div>
                <Form.Item name="ecs_image" className="mb-0">
                  <ImageUpload label="Upload ECS/NACH Form" />
                </Form.Item>
              </div>
            </div>
          </div>
        )}

        {/* SI Section */}
        {instrumentType === "SI" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground">Standing Instruction (SI) Details</h3>

            <div className="bg-foreground/5 rounded-2xl border border-border p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Form.Item label="Account Number" name="si_accountNumber" className="mb-0">
                   <Input placeholder="Internal Bank Acc No" className="bg-background border-border font-bold h-10" />
                </Form.Item>

                <Form.Item label="Signed By" name="si_signedBy" className="mb-0">
                  <Select className="w-full font-bold h-10" placeholder="Select Entity">
                    <Option value="Applicant">Applicant</Option>
                    <Option value="Co-applicant">Co-applicant</Option>
                    <Option value="Guarantor">Guarantor</Option>
                  </Select>
                </Form.Item>
              </div>

              {/* SI Document Upload */}
              <div className="mt-4 p-4 bg-foreground/5 rounded-xl border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="Image" size={16} className="text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Document Verification</span>
                </div>
                <Form.Item name="si_image" className="mb-0">
                  <ImageUpload label="Upload SI Document" />
                </Form.Item>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostFileInstrumentDetails;
