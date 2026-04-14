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
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card
        size="small"
        title="Documents"
        extra={
          <Space>
            <Text type={allUploadedDocsTagged ? "success" : "secondary"}>
              Tagged {docsTaggedCount}/{documents.length}
            </Text>
            <Button
              danger
              onClick={() => {
                setDocuments([]);
                schedulePersist(250);
              }}
              disabled={!documents.length}
            >
              Clear All
            </Button>
          </Space>
        }
        bordered
      >
        <Text type="secondary">
          Upload files and tag them (RC, Forms, PAN, Aadhaar/GST, policies,
          etc.).
        </Text>
        <Divider style={{ marginBlock: 12 }} />
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
              schedulePersist(250);
            }
          }}
        >
          <p className="ant-upload-drag-icon" />
          <p className="ant-upload-text">Click or drag files to upload</p>
          <p className="ant-upload-hint">Multiple files supported</p>
        </Dragger>
      </Card>

      <Card size="small" title="Uploaded Files" bordered>
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
                    schedulePersist(250);
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
      </Card>
    </Space>
  );
};

export default Step6Documents;
