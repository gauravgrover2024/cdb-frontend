import React from "react";
import {
  Button,
  Card,
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

const Step6Documents = ({
  documents,
  setDocuments,
  schedulePersist,
  docRows,
  docsTaggedCount,
  allUploadedDocsTagged,
}) => {
  return (
    <div className="flex flex-col gap-8">
      {/* Section 1: Upload */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Documentation</h3>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase ${allUploadedDocsTagged ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
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
          Upload files and tag them (RC, Forms, PAN, Aadhaar/GST, policies, etc.).
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
        <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-400">Uploaded Files</h3>
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
                  options={requiredDocumentTags.map((t) => ({
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
