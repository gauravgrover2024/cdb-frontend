import React from "react";
import {
  Alert,
  Button,
  Col,
  Divider,
  Row,
  Select,
  Space,
  Table,
  Typography,
  Upload,
} from "antd";
import { requiredDocumentTags } from "./allSteps";

const { Text } = Typography;
const { Dragger } = Upload;

const DOCUMENT_MATRIX = {
  "new-car-insurance": {
    label: "New Car Insurance",
    mandatory: ["Invoice"],
    optional: ["New Policy", "New policy covernote"],
  },
  "used-car-insurance": {
    label: "Used Car Insurance",
    mandatory: ["RC", "Form 29", "Form 30 page 1", "Form 30 page 2"],
    optional: ["New Policy", "New policy covernote", "Inspection report"],
  },
  "used-car-renewal": {
    label: "Used Car Renewal",
    mandatory: ["RC", "Previous Year Policy"],
    optional: ["New Policy", "New policy covernote"],
  },
  "policy-already-expired": {
    label: "Policy Already Expired",
    mandatory: ["RC", "Previous Year Policy"],
    optional: ["New Policy", "New policy covernote", "Inspection report"],
  },
};

const getScenarioFromForm = (formData = {}) => {
  if (formData?.vehicleType === "New Car") return "new-car-insurance";

  const expiryDates = [
    formData?.previousOdExpiryDate,
    formData?.previousTpExpiryDate,
  ]
    .filter(Boolean)
    .map((x) => new Date(x))
    .filter((d) => !Number.isNaN(d.getTime()));

  const isExpired =
    expiryDates.length > 0 &&
    Math.max(...expiryDates.map((d) => d.getTime())) < Date.now();

  if (isExpired) return "policy-already-expired";

  const hasPreviousPolicy =
    Boolean(String(formData?.previousPolicyNumber || "").trim()) ||
    Boolean(String(formData?.previousInsuranceCompany || "").trim());

  if (hasPreviousPolicy) return "used-car-renewal";
  return "used-car-insurance";
};

const Step6Documents = ({
  formData,
  documents,
  setDocuments,
  schedulePersist,
  docRows,
  docsTaggedCount,
  allUploadedDocsTagged,
}) => {
  const [scenario, setScenario] = React.useState(getScenarioFromForm(formData));

  React.useEffect(() => {
    setScenario(getScenarioFromForm(formData));
  }, [formData]);

  const activeRequirement =
    DOCUMENT_MATRIX[scenario] || DOCUMENT_MATRIX["used-car-renewal"];
  const uploadedTagSet = new Set(
    (documents || []).map((d) => String(d?.tag || "").trim()).filter(Boolean),
  );
  const missingMandatory = activeRequirement.mandatory.filter(
    (tag) => !uploadedTagSet.has(tag),
  );

  const tagOptions = Array.from(
    new Set([
      ...requiredDocumentTags,
      ...Object.values(DOCUMENT_MATRIX).flatMap((r) => [
        ...r.mandatory,
        ...r.optional,
      ]),
    ]),
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Section 0: Requirement Matrix */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Document Requirements
          </h3>
          <Select
            value={scenario}
            style={{ minWidth: 240 }}
            options={Object.entries(DOCUMENT_MATRIX).map(([value, cfg]) => ({
              value,
              label: cfg.label,
            }))}
            onChange={setScenario}
          />
        </div>

        {missingMandatory.length > 0 ? (
          <Alert
            type="warning"
            showIcon
            message={`Missing mandatory tags (${missingMandatory.length})`}
            description={missingMandatory.join(", ")}
            className="mb-4"
          />
        ) : (
          <Alert
            type="success"
            showIcon
            message="All mandatory document tags are covered"
            className="mb-4"
          />
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Mandatory Docs
            </div>
            <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
              {activeRequirement.mandatory.map((doc) => (
                <li key={doc}>{doc}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Optional Docs
            </div>
            <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
              {activeRequirement.optional.map((doc) => (
                <li key={doc}>{doc}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Section 1: Upload */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Documentation
          </h3>
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase ${allUploadedDocsTagged ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
            >
              Tagged {docsTaggedCount}/{documents.length}
            </div>
            <Button
              size="small"
              danger
              type="text"
              onClick={() => {
                setDocuments([]);
                // schedulePersist(250);
              }}
              disabled={!documents.length}
            >
              Clear All
            </Button>
          </div>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Upload files and tag them one-by-one from the Tag column.
        </p>
        <Dragger
          multiple
          beforeUpload={() => false}
          showUploadList={false}
          onChange={(info) => {
            const files = info?.fileList || [];
            const incoming = files
              .map((f) => f.originFileObj)
              .filter(Boolean)
              .map((file) => ({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                name: file.name,
                size: file.size,
                type: file.type,
                tag: "",
              }));
            if (incoming.length) {
              setDocuments((prev) => [...prev, ...incoming]);
              // schedulePersist(250);
            }
          }}
        >
          <p className="ant-upload-drag-icon" />
          <p className="ant-upload-text">Click or drag files to upload</p>
          <p className="ant-upload-hint">Multiple files supported</p>
        </Dragger>
      </div>

      {/* Section 2: Uploaded List */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-400">
          Uploaded Files
        </h3>
        <Table
          size="small"
          dataSource={docRows}
          pagination={false}
          columns={[
            { title: "File", dataIndex: "name", key: "name" },
            {
              title: "Size (KB)",
              dataIndex: "sizeKb",
              key: "size",
              width: 120,
            },
            {
              title: "Tag",
              key: "tag",
              width: 220,
              render: (_, row) => (
                <Select
                  value={row.tag || undefined}
                  placeholder="Select tag"
                  style={{ width: "100%" }}
                  options={tagOptions.map((t) => ({
                    label: t,
                    value: t,
                  }))}
                  onChange={(v) => {
                    setDocuments((prev) =>
                      prev.map((x) => (x.id === row.id ? { ...x, tag: v } : x)),
                    );
                    // schedulePersist(250);
                  }}
                />
              ),
            },
          ]}
        />
        {!documents.length ? (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">No documents uploaded yet.</Text>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Step6Documents;
