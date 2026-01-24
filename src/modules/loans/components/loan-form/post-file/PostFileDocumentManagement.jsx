import React, { useState } from "react";
import { Form } from "antd";
import Icon from "../../../../../components/AppIcon";
import Button from "../../../../../components/ui/Button";

const SUGGESTED_TAGS = [
  "Aadhaar",
  "PAN",
  "Application Form",
  "Margin Money",
  "Invoice",
  "Online Kit",
  "SI",
  "Cheque Copies",
  "ECS",
  "Insurance",
  "GST",
  "MSME",
];

const PostFileDocumentManagement = ({ form }) => {
  const [documents, setDocuments] = useState([]);
  const [tags, setTags] = useState([]);
  const [showAddTagsModal, setShowAddTagsModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterTag, setFilterTag] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Get company type to show GST/MSME tags
  const customerType = Form.useWatch("customerType", form);
  const isCompany = customerType === "Company";

  const availableTags = isCompany
    ? SUGGESTED_TAGS
    : SUGGESTED_TAGS.filter((tag) => tag !== "GST" && tag !== "MSME");

  const addTags = (newTags) => {
    const uniqueTags = newTags.filter(
      (tag) => !tags.some((t) => t.name === tag)
    );
    const tagObjects = uniqueTags.map((tagName) => ({
      id: Date.now() + Math.random(),
      name: tagName,
      documentCount: 0,
    }));
    setTags([...tags, ...tagObjects]);
  };

  const deleteTag = (tagId) => {
    setTags(tags.filter((t) => t.id !== tagId));
    setDocuments(
      documents.map((doc) =>
        doc.tagId === tagId ? { ...doc, tagId: null, tag: null } : doc
      )
    );
  };

  const uploadDocuments = (files) => {
    const newDocs = files.map((file) => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: formatFileSize(file.size),
      uploadedBy: "Current User",
      uploadedAt: new Date().toLocaleString("en-IN"),
      status: "pending",
      tagId: null,
      tag: null,
      url: URL.createObjectURL(file),
      file: file,
    }));
    setDocuments([...documents, ...newDocs]);
  };

  const assignTag = (docId, tagName) => {
    // Check if tag exists, if not create it
    let tag = tags.find((t) => t.name === tagName);

    if (!tag) {
      // Create new tag
      const newTag = {
        id: Date.now() + Math.random(),
        name: tagName,
        documentCount: 0,
      };
      setTags([...tags, newTag]);
      tag = newTag;
    }

    setDocuments(
      documents.map((doc) =>
        doc.id === docId ? { ...doc, tagId: tag.id, tag: tag.name } : doc
      )
    );

    updateTagCounts();
  };

  const updateTagCounts = () => {
    setTimeout(() => {
      const counts = {};
      documents.forEach((doc) => {
        if (doc.tagId) {
          counts[doc.tagId] = (counts[doc.tagId] || 0) + 1;
        }
      });

      setTags(
        tags.map((tag) => ({
          ...tag,
          documentCount: counts[tag.id] || 0,
        }))
      );
    }, 100);
  };

  const deleteDocument = (docId) => {
    setDocuments(documents.filter((d) => d.id !== docId));
    updateTagCounts();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "verified":
        return "bg-success/10 text-success";
      case "submitted":
        return "bg-warning/10 text-warning";
      case "pending":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const [viewDocument, setViewDocument] = useState(null);
  const [showAllDocumentsModal, setShowAllDocumentsModal] = useState(false);

  return (
    <div className="bg-card rounded-lg shadow-elevation-2 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 md:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="FolderOpen" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground">
              Document Management
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              {documents.length} documents • {tags.length} tags
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {documents.length > 0 && (
            <Button
              variant="outline"
              iconName="Eye"
              iconPosition="left"
              size="sm"
              onClick={() => setShowAllDocumentsModal(true)}
            >
              View All
            </Button>
          )}
          <Button
            variant="outline"
            iconName="Tag"
            iconPosition="left"
            size="sm"
            onClick={() => setShowAddTagsModal(true)}
          >
            Add Tags
          </Button>
          <Button
            variant="default"
            iconName="Upload"
            iconPosition="left"
            size="sm"
            onClick={() => setShowUploadModal(true)}
          >
            Upload
          </Button>
        </div>
      </div>

      {/* Tags Panel */}
      {tags.length > 0 && (
        <div className="mb-4 md:mb-6 p-4 bg-muted/30 rounded-lg border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Icon name="Tag" size={16} />
            Document Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs border border-primary/20"
              >
                <Icon name="Tag" size={12} />
                <span className="font-medium">{tag.name}</span>
                <span className="text-[10px] bg-primary/20 px-1.5 py-0.5 rounded-full">
                  {tag.documentCount}
                </span>
                <button
                  onClick={() => deleteTag(tag.id)}
                  className="hover:text-error transition-colors"
                >
                  <Icon name="X" size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Untagged Documents Alert */}
      {documents.filter((d) => !d.tagId).length > 0 && (
        <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-2">
          <Icon name="AlertCircle" size={16} className="text-warning mt-0.5" />
          <div className="text-xs">
            <p className="font-medium text-warning">
              {documents.filter((d) => !d.tagId).length} document(s) not tagged
            </p>
            <p className="text-warning/80 mt-1">
              Please assign tags to all uploaded documents
            </p>
          </div>
        </div>
      )}

      {/* Document List */}
      <div className="space-y-3 md:space-y-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Document Preview */}
              <div
                className="w-full sm:w-24 h-32 sm:h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer"
                onClick={() => setViewDocument(doc)}
              >
                {doc.url ? (
                  <img
                    src={doc.url}
                    alt={doc.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon
                      name="FileText"
                      size={32}
                      className="text-muted-foreground"
                    />
                  </div>
                )}
              </div>

              {/* Document Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon
                        name="FileText"
                        size={18}
                        className="text-primary"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm md:text-base font-semibold text-foreground truncate">
                        {doc.tag || doc.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {doc.size} • {doc.uploadedBy}
                      </p>

                      {/* Tag Badge or Assignment */}
                      <div className="mt-2">
                        {doc.tag ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs border border-primary/20">
                              <Icon name="Tag" size={12} />
                              {doc.tag}
                            </span>
                            <button
                              onClick={() => {
                                setDocuments(
                                  documents.map((d) =>
                                    d.id === doc.id
                                      ? { ...d, tagId: null, tag: null }
                                      : d
                                  )
                                );
                                updateTagCounts();
                              }}
                              className="text-xs text-muted-foreground hover:text-error"
                            >
                              <Icon name="X" size={12} />
                            </button>
                          </div>
                        ) : (
                          <TagInputWithSuggestions
                            docId={doc.id}
                            availableTags={tags.map((t) => t.name)}
                            onAssign={(tagName) => assignTag(doc.id, tagName)}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1.5">
                    <Icon name="Calendar" size={14} />
                    <span>{doc.uploadedAt}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    iconName="Eye"
                    iconPosition="left"
                    size="xs"
                    onClick={() => setViewDocument(doc)}
                  >
                    View
                  </Button>
                  <Button
                    variant="outline"
                    iconName="Download"
                    iconPosition="left"
                    size="xs"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = doc.url;
                      link.download = doc.name;
                      link.click();
                    }}
                  >
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    iconName="Trash2"
                    iconPosition="left"
                    size="xs"
                    onClick={() => deleteDocument(doc.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {documents.length === 0 && (
          <div className="text-center py-12 md:py-16">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
              <Icon name="Upload" size={32} className="text-muted-foreground" />
            </div>
            <p className="text-sm md:text-base font-medium text-foreground">
              No documents uploaded yet
            </p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 mb-4">
              Upload your first document to get started
            </p>
            <Button
              variant="default"
              iconName="Upload"
              iconPosition="left"
              size="sm"
              onClick={() => setShowUploadModal(true)}
            >
              Upload Document
            </Button>
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      {viewDocument && (
        <DocumentViewerModal
          document={viewDocument}
          allDocuments={documents}
          onClose={() => setViewDocument(null)}
          onNavigate={(doc) => setViewDocument(doc)}
        />
      )}

      {/* View All Documents Modal */}
      {showAllDocumentsModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Icon name="FolderOpen" size={18} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  All Documents ({documents.length})
                </span>
              </div>
              <button
                onClick={() => setShowAllDocumentsModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted"
              >
                <Icon name="X" size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => {
                      setViewDocument(doc);
                      setShowAllDocumentsModal(false);
                    }}
                  >
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      {doc.url ? (
                        <img
                          src={doc.url}
                          alt={doc.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Icon
                          name="FileText"
                          size={48}
                          className="text-muted-foreground"
                        />
                      )}
                    </div>
                    <div className="p-3 bg-card">
                      <p className="text-sm font-medium text-foreground truncate">
                        {doc.tag || doc.name}
                      </p>
                      {doc.tag && (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] border border-primary/20">
                            <Icon name="Tag" size={10} />
                            {doc.tag}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {doc.size}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllDocumentsModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Tags Modal */}
      {showAddTagsModal && (
        <AddTagsModal
          availableTags={availableTags}
          existingTags={tags.map((t) => t.name)}
          onAdd={addTags}
          onClose={() => setShowAddTagsModal(false)}
        />
      )}

      {/* Upload Documents Modal */}
      {showUploadModal && (
        <UploadDocumentsModal
          onUpload={uploadDocuments}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {/* Footer Stats */}
      {documents.length > 0 && (
        <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">
                {documents.filter((d) => d.tag).length} Tagged
              </span>
              <div className="w-2 h-2 rounded-full bg-warning ml-3" />
              <span className="text-xs text-muted-foreground">
                {documents.filter((d) => !d.tag).length} Untagged
              </span>
            </div>
            <Button
              variant="ghost"
              iconName="Download"
              iconPosition="left"
              size="sm"
            >
              Export All
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const TagInputWithSuggestions = ({ docId, availableTags, onAssign }) => {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredTags = availableTags.filter((tag) =>
    tag.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelect = (tag) => {
    onAssign(tag);
    setInputValue("");
    setShowSuggestions(false);
  };

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      onAssign(trimmed);
      setInputValue("");
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      <div className="relative flex-1">
        <input
          type="text"
          className="w-full border border-border rounded-md px-3 py-1.5 text-xs bg-background pr-8"
          placeholder="Type tag name..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(e.target.value.length > 0);
          }}
          onFocus={() => inputValue && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Icon
          name="Tag"
          size={14}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredTags.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto z-10">
            {filteredTags.map((tag, index) => (
              <div
                key={index}
                className="px-3 py-2 text-xs hover:bg-muted cursor-pointer flex items-center gap-2"
                onClick={() => handleSelect(tag)}
              >
                <Icon name="Tag" size={12} className="text-primary" />
                {tag}
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        className="px-3 py-1.5 bg-primary text-white rounded-md text-xs hover:bg-primary/90 disabled:opacity-50"
        disabled={!inputValue.trim()}
      >
        Tag
      </button>
    </div>
  );
};

const DocumentViewerModal = ({
  document,
  allDocuments,
  onClose,
  onNavigate,
}) => {
  const currentIndex = allDocuments.findIndex((d) => d.id === document.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allDocuments.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      onNavigate(allDocuments[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onNavigate(allDocuments[currentIndex + 1]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowLeft") handlePrev();
    if (e.key === "ArrowRight") handleNext();
    if (e.key === "Escape") onClose();
  };

  React.useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex]);

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
      <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon name="Eye" size={18} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {document.tag || document.name}
            </span>
            <span className="text-xs text-muted-foreground">
              ({currentIndex + 1} of {allDocuments.length})
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/20 relative">
          {/* Previous Button */}
          {hasPrev && (
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-muted z-10"
            >
              <Icon name="ChevronLeft" size={20} />
            </button>
          )}

          {/* Image */}
          <img
            src={document.url}
            alt={document.name}
            className="max-w-full max-h-full object-contain"
          />

          {/* Next Button */}
          {hasNext && (
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-muted z-10"
            >
              <Icon name="ChevronRight" size={20} />
            </button>
          )}
        </div>

        <div className="flex justify-between items-center px-4 py-3 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {document.size} • Uploaded by {document.uploadedBy}
            {document.tag && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">
                <Icon name="Tag" size={10} />
                {document.tag}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              iconName="Download"
              iconPosition="left"
              size="sm"
              onClick={() => {
                const link = document.createElement("a");
                link.href = document.url;
                link.download = document.name;
                link.click();
              }}
            >
              Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddTagsModal = ({ availableTags, existingTags, onAdd, onClose }) => {
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTag, setCustomTag] = useState("");

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const addCustomTag = () => {
    const trimmedTag = customTag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      setSelectedTags([...selectedTags, trimmedTag]);
      setCustomTag("");
    }
  };

  const handleAdd = () => {
    const newTags = selectedTags.filter((tag) => !existingTags.includes(tag));
    if (newTags.length > 0) {
      onAdd(newTags);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon name="Tag" size={18} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Add Document Tags
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Suggested Tags */}
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-2">
              Suggested Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                const alreadyExists = existingTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => !alreadyExists && toggleTag(tag)}
                    disabled={alreadyExists}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      alreadyExists
                        ? "bg-muted/50 text-muted-foreground border-border cursor-not-allowed"
                        : isSelected
                        ? "bg-primary text-white border-primary"
                        : "bg-background text-foreground border-border hover:border-primary"
                    }`}
                  >
                    {tag}
                    {alreadyExists && (
                      <span className="ml-1.5 text-[10px]">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Tag Input */}
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-2">
              Create Custom Tag
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="Enter custom tag name..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
              />
              <Button size="sm" onClick={addCustomTag}>
                Add
              </Button>
            </div>
          </div>

          {/* Selected Tags */}
          {selectedTags.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-2">
                Selected Tags ({selectedTags.length})
              </h4>
              <div className="flex flex-wrap gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                {selectedTags.map((tag) => (
                  <div
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs border border-primary/20"
                  >
                    <span>{tag}</span>
                    <button
                      onClick={() => toggleTag(tag)}
                      className="hover:text-error"
                    >
                      <Icon name="X" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={selectedTags.length === 0}
          >
            Add {selectedTags.length} Tag{selectedTags.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </div>
  );
};

const UploadDocumentsModal = ({ onUpload, onClose }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      onUpload(selectedFiles);
      onClose();
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon name="Upload" size={18} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Upload Documents
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* File Upload Area */}
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              id="fileUpload"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx"
            />
            <label
              htmlFor="fileUpload"
              className="cursor-pointer flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Icon name="Upload" size={24} className="text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, DOC, DOCX, PNG, JPG (max 10MB each)
              </p>
            </label>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-2">
                Selected Files ({selectedFiles.length})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Icon
                        name="File"
                        size={18}
                        className="text-primary flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1.5 rounded-lg hover:bg-error/10 hover:text-error flex-shrink-0"
                    >
                      <Icon name="Trash2" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleUpload}
            disabled={selectedFiles.length === 0}
          >
            Upload {selectedFiles.length} File
            {selectedFiles.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PostFileDocumentManagement;
