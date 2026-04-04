import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Form } from "antd";
import Icon from "../../../../../components/AppIcon";
import Button from "../../../../../components/ui/Button";
import { customersApi } from "../../../../../api/customers";
import { uploadSingleFile } from "../../../../../api/uploads";
import LoanDocumentViewerModal from "../../shared/LoanDocumentViewerModal";
import LoanDocumentUploadModal from "../../shared/LoanDocumentUploadModal";

const getTagColor = () =>
  "bg-secondary text-secondary-foreground border-border";

const SUGGESTED_TAGS = [
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

const normalizeTagKey = (value) => String(value || "").trim().toLowerCase();

const toCanonicalTagName = (value, existingTagNames = [], suggestedTagNames = []) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  const normalized = normalizeTagKey(trimmed);
  const match = [...existingTagNames, ...suggestedTagNames].find(
    (tag) => normalizeTagKey(tag) === normalized,
  );

  if (match) return match;

  // Keep acronyms in uppercase, title-case everything else.
  if (/^[a-z]{2,6}$/i.test(trimmed) && trimmed.length <= 5) {
    return trimmed.toUpperCase();
  }

  return trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const getStableDocId = (doc, fallback = "") =>
  String(
    doc?.id ||
      doc?.publicId ||
      doc?.url ||
      doc?.name ||
      fallback ||
      "",
  );

const getDocDisplayLabel = (doc, index = -1) => {
  const tag = String(doc?.tag || "").trim();
  if (tag) return tag;
  return index >= 0 ? `Document ${index + 1}` : "Document";
};

const PostFileDocumentManagement = ({ form }) => {
  const [documents, setDocuments] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTagFilter, setSelectedTagFilter] = useState("All");
  const [showAddTagsModal, setShowAddTagsModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isFetchingDocs, setIsFetchingDocs] = useState(false);
  const [didHydrateFromForm, setDidHydrateFromForm] = useState(false);
  const lastHydratedSignatureRef = useRef("");
  const lastFormSyncSignatureRef = useRef("");

  const customerId = Form.useWatch("customerId", form);
  const watchedPostFileDocuments = Form.useWatch("postfile_documents", form);
  const watchedPostFileTags = Form.useWatch("postfile_tags", form);
  
  // 🔄 FETCH DOCUMENTS from Customer Record
  const fetchCustomerDocuments = useCallback(async (isManual = false) => {
    if (!customerId) return;
    
    try {
      setIsFetchingDocs(true);
      
      const response = await customersApi.getById(customerId);
      const freshCustomer = response?.data;
      
      if (freshCustomer) {
         // 1. Update Form Fields
         const updates = {
          aadhaarCardDocUrl: freshCustomer.aadhaarCardDocUrl,
          panCardDocUrl: freshCustomer.panCardDocUrl,
          passportDocUrl: freshCustomer.passportDocUrl,
          dlDocUrl: freshCustomer.dlDocUrl,
          addressProofDocUrl: freshCustomer.addressProofDocUrl,
          gstDocUrl: freshCustomer.gstDocUrl,
          photoUrl: freshCustomer.photoUrl,
          signatureUrl: freshCustomer.signatureUrl,
         };
         
         const validUpdates = {};
         let hasUpdates = false;
         Object.keys(updates).forEach(key => {
           if (updates[key]) {
             validUpdates[key] = updates[key];
             hasUpdates = true;
           }
         });
         
         if (hasUpdates) {
           form.setFieldsValue(validUpdates);
           
           // 2. Direct State Update (Bypassing Watcher Lag)
           const preFileDocs = [];
           const addPreFile = (url, name, tagName) => {
              if (url && typeof url === 'string') {
                preFileDocs.push({
                  id: name.toLowerCase().replace(/\s/g, '_'), 
                  name: name,
                  size: "Pre-File",
                  uploadedBy: "System",
                  uploadedAt: new Date().toLocaleDateString("en-IN"),
                  status: "submitted",
                  tagId: "prefile_" + name,
                  tag: tagName,
                  url: url,
                  format: url.split('.').pop() || 'jpg',
                  publicId: null,
                  isPreFile: true,
                });
              }
            };

            addPreFile(updates.aadhaarCardDocUrl, "Aadhaar Card", "Aadhaar");
            addPreFile(updates.panCardDocUrl, "PAN Card", "PAN");
            addPreFile(updates.passportDocUrl, "Passport", "Passport");
            addPreFile(updates.dlDocUrl, "Driving License", "Driving License");
            addPreFile(updates.addressProofDocUrl, "Address Proof", "Address Proof");
            addPreFile(updates.gstDocUrl, "GST Certificate", "GST");
            addPreFile(updates.photoUrl, "Customer Photo", "Photo");
            addPreFile(updates.signatureUrl, "Signature", "Signature");

            if (preFileDocs.length > 0) {
              setDocuments(prevDocs => {
                const mergedDocs = [...prevDocs];
                let changed = false;
                preFileDocs.forEach(pDoc => {
                  if (!mergedDocs.some(d => d.url === pDoc.url)) {
                    mergedDocs.push(pDoc);
                    changed = true;
                  }
                });
                return changed ? mergedDocs : prevDocs;
              });
            }

           if (isManual) {
              // message is global in antd usually, or imports
              // message.success(`Synced ${preFileDocs.length} documents from customer record`);
              // We'll use alert for visibility if message is not available contextually, or assume message is usable
              // Since I can't guarantee message import, I'll log.
              console.log(`Synced ${preFileDocs.length} documents.`);
           }
         }
      }
    } catch (err) {
      console.error("Error fetching customer docs directly:", err);
    } finally {
      setIsFetchingDocs(false);
    }
  }, [customerId, form]);

  // 🔄 SAFETY FETCH: If docs are missing in form but we have a customerId, fetch them!
  useEffect(() => {
    fetchCustomerDocuments(false);
  }, [fetchCustomerDocuments]);

  // Get company type to show GST/MSME tags
  const customerType = Form.useWatch("customerType", form);
  const isCompany = customerType === "Company";

  // Watch Pre-File Documents to auto-populate
  const aadhaarCardDocUrl = Form.useWatch("aadhaarCardDocUrl", form);
  const panCardDocUrl = Form.useWatch("panCardDocUrl", form);
  const passportDocUrl = Form.useWatch("passportDocUrl", form);
  const dlDocUrl = Form.useWatch("dlDocUrl", form);
  const addressProofDocUrl = Form.useWatch("addressProofDocUrl", form);
  const gstDocUrl = Form.useWatch("gstDocUrl", form);
  const photoUrl = Form.useWatch("photoUrl", form);
  const signatureUrl = Form.useWatch("signatureUrl", form);

  const docsSignature = useCallback((docs = []) => {
    try {
      return JSON.stringify(
        (Array.isArray(docs) ? docs : []).map((doc) => ({
          id: doc?.id || "",
          name: doc?.name || "",
          url: doc?.url || "",
          tag: doc?.tag || "",
          tagId: doc?.tagId || "",
          isPreFile: Boolean(doc?.isPreFile),
        })),
      );
    } catch {
      return "";
    }
  }, []);

  const tagsSignature = useCallback((list = []) => {
    try {
      return JSON.stringify(
        (Array.isArray(list) ? list : []).map((tag) => ({
          id: tag?.id || "",
          name: tag?.name || "",
        })),
      );
    } catch {
      return "";
    }
  }, []);

  const buildPreFileDocuments = useCallback(() => {
    const preFileDocs = [];
    const addPreFile = (url, name, tagName) => {
      if (url && typeof url === "string") {
        preFileDocs.push({
          id: name.toLowerCase().replace(/\s/g, "_"),
          name,
          size: "Pre-File",
          uploadedBy: "System",
          uploadedAt: new Date().toLocaleDateString("en-IN"),
          status: "submitted",
          tagId: `prefile_${name}`,
          tag: tagName,
          url,
          format: url.split(".").pop() || "jpg",
          publicId: null,
          isPreFile: true,
        });
      }
    };
    addPreFile(aadhaarCardDocUrl, "Aadhaar Card", "KYC");
    addPreFile(panCardDocUrl, "PAN Card", "KYC");
    addPreFile(passportDocUrl, "Passport", "KYC");
    addPreFile(dlDocUrl, "Driving License", "KYC");
    addPreFile(addressProofDocUrl, "Address Proof", "KYC");
    addPreFile(gstDocUrl, "GST Certificate", "Business");
    addPreFile(photoUrl, "Customer Photo", "Photo");
    addPreFile(signatureUrl, "Signature", "Signature");
    return preFileDocs;
  }, [
    aadhaarCardDocUrl,
    panCardDocUrl,
    passportDocUrl,
    dlDocUrl,
    addressProofDocUrl,
    gstDocUrl,
    photoUrl,
    signatureUrl,
  ]);

  const mergeDocuments = useCallback((existing = [], preFile = []) => {
    const base = (Array.isArray(existing) ? existing : []).map((doc, index) => ({
      ...doc,
      id: getStableDocId(doc, `existing_${index}`),
    }));
    const merged = [...base];
    preFile.forEach((doc, index) => {
      const normalized = {
        ...doc,
        id: getStableDocId(doc, `prefile_${index}`),
      };
      const hasMatch = merged.some(
        (item) =>
          (item?.url && normalized?.url && item.url === normalized.url) ||
          (item?.id && normalized?.id && item.id === normalized.id),
      );
      if (!hasMatch) merged.push(normalized);
    });
    return merged;
  }, []);

  // LOAD INITIAL FROM FORM & PRE-FILE
  useEffect(() => {
    const existingDocs = Array.isArray(watchedPostFileDocuments)
      ? watchedPostFileDocuments
      : [];
    const existingTags = Array.isArray(watchedPostFileTags)
      ? watchedPostFileTags
      : [];
    const mergedDocs = mergeDocuments(existingDocs, buildPreFileDocuments());
    const incomingSignature = `${docsSignature(mergedDocs)}|${tagsSignature(existingTags)}`;

    if (didHydrateFromForm && incomingSignature === lastHydratedSignatureRef.current) {
      return;
    }

    setDocuments((prev) =>
      docsSignature(mergedDocs) !== docsSignature(prev) ? mergedDocs : prev,
    );
    setTags((prev) =>
      tagsSignature(existingTags) !== tagsSignature(prev) ? existingTags : prev,
    );
    lastHydratedSignatureRef.current = incomingSignature;
    lastFormSyncSignatureRef.current = incomingSignature;
    setDidHydrateFromForm(true);
  }, [
    watchedPostFileDocuments,
    watchedPostFileTags,
    buildPreFileDocuments,
    mergeDocuments,
    docsSignature,
    tagsSignature,
    didHydrateFromForm,
  ]);

  // Keep form in sync once initial hydration has happened.
  useEffect(() => {
    if (!didHydrateFromForm) return;
    const nextSignature = `${docsSignature(documents)}|${tagsSignature(tags)}`;
    if (lastFormSyncSignatureRef.current === nextSignature) return;
    lastFormSyncSignatureRef.current = nextSignature;
    form.setFieldsValue({
      postfile_documents: documents,
      postfile_tags: tags,
    });
  }, [didHydrateFromForm, documents, tags, form, docsSignature, tagsSignature]);

  const availableTags = isCompany
    ? SUGGESTED_TAGS
    : SUGGESTED_TAGS.filter((tag) => tag !== "GST" && tag !== "MSME");

  const addTags = (newTags) => {
    const canonicalTags = newTags
      .map((tag) =>
        toCanonicalTagName(
          tag,
          tags.map((t) => t.name),
          availableTags,
        ),
      )
      .filter(Boolean);

    const uniqueTags = canonicalTags.filter(
      (tag) => !tags.some((t) => normalizeTagKey(t.name) === normalizeTagKey(tag))
    );
    const tagObjects = uniqueTags.map((tagName) => ({
      id: Date.now() + Math.random(),
      name: tagName,
      documentCount: 0,
    }));
    setTags((prev) => [...prev, ...tagObjects]);
  };

  const deleteTag = (tagId) => {
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.tagId === tagId ? { ...doc, tagId: null, tag: null } : doc
      )
    );
  };

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadDocuments = async (files) => {
    setUploading(true);
    setUploadProgress(0);
    const totalFiles = files.length;
    const newDocs = [];

    try {
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        
        try {
          let uploadedData;
          try {
             uploadedData = await uploadSingleFile(file);
          } catch (err) {
             console.error(`Failed to upload ${file.name}:`, err);
             uploadedData = null;
          }

          newDocs.push({
            id:
              uploadedData?.public_id ||
              `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            name: file.name,
            size: formatFileSize(file.size),
            uploadedBy: "Current User", // Replace with actual user
            uploadedAt: new Date().toLocaleString("en-IN"),
            status: uploadedData ? "submitted" : "pending",
            tagId: null,
            tag: null,
            url: uploadedData ? uploadedData.url : URL.createObjectURL(file),
            format: uploadedData?.format || file.type.split('/')[1] || 'unknown',
            publicId: uploadedData?.public_id,
            file: file,
          });

        } catch (error) {
          console.error(`Error uploading file ${file.name}`, error);
          // Only alert once
          if (i === 0) alert(`Failed to upload ${file.name}. Please check console.`);
        }
        
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }
      
      if (newDocs.length > 0) {
        setDocuments((prev) => [...prev, ...newDocs]);
      }
      setShowUploadModal(false);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const assignTag = (docId, tagName) => {
    const canonicalBaseName = toCanonicalTagName(
      tagName,
      tags.map((t) => t.name),
      availableTags,
    );

    if (!canonicalBaseName) return;

    // 🏷️ Auto-Increment Tag Name if used (e.g., Aadhaar -> Aadhaar 2)
    let finalTagName = canonicalBaseName;
    let counter = 2;
    
    // Check if any OTHER document already uses this tag name
    const isUsed = (name) =>
      documents.some(
        (d) => normalizeTagKey(d.tag) === normalizeTagKey(name) && d.id !== docId,
      );
    
    while (isUsed(finalTagName)) {
        finalTagName = `${canonicalBaseName} ${counter}`;
        counter++;
    }
    
    // Now use finalTagName for creation/assignment
    let tag = tags.find(
      (t) => normalizeTagKey(t.name) === normalizeTagKey(finalTagName),
    );

    if (!tag) {
      // Create new tag if it doesn't exist (e.g. Aadhaar 2)
      const newTag = {
        id: Date.now() + Math.random(),
        name: finalTagName,
        documentCount: 0,
      };
      setTags((prev) => [...prev, newTag]);
      tag = newTag;
    }

    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId ? { ...doc, tagId: tag.id, tag: tag.name } : doc
      )
    );
  };

  const deleteDocument = (docId) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  // NOTE:
  // Post-file Documents Manager now follows manual-save flow only.
  // We intentionally do not auto-persist here to avoid repeated re-paints/flicker.

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  // 🎨 Dynamic Tag Colors (Using Global Helper)
  const [viewDocument, setViewDocument] = useState(null);
  const [showAllDocumentsModal, setShowAllDocumentsModal] = useState(false);
  const viewerIndex = useMemo(() => {
    if (!viewDocument) return 0;
    const idx = documents.findIndex(
      (doc) => getStableDocId(doc) === getStableDocId(viewDocument),
    );
    return idx >= 0 ? idx : 0;
  }, [documents, viewDocument]);

  // Removed inner getTagColor definition

// ... (skip lines) ...


  // ... (Code removed) ...
  const tagCountsByName = documents.reduce(
    (acc, doc) => {
      if (doc.tag) {
        acc[doc.tag] = (acc[doc.tag] || 0) + 1;
      } else {
        acc.Untagged += 1;
      }
      return acc;
    },
    { All: documents.length, Untagged: 0 },
  );

  const vaultTags = tags.map((tag) => ({
    ...tag,
    liveCount: tagCountsByName[tag.name] || 0,
  }));

  const filteredDocuments =
    selectedTagFilter === "All"
      ? documents
      : selectedTagFilter === "Untagged"
        ? documents.filter((doc) => !doc.tag)
        : documents.filter((doc) => doc.tag === selectedTagFilter);

  const taggedCount = documents.filter((d) => d.tag).length;
  const untaggedCount = documents.length - taggedCount;
  const preFileCount = documents.filter((d) => d.isPreFile).length;
  const uploadedCount = documents.length - preFileCount;

  useEffect(() => {
    const counts = documents.reduce((acc, doc) => {
      if (doc.tag) {
        acc[doc.tag] = (acc[doc.tag] || 0) + 1;
      }
      return acc;
    }, {});

    setTags((prev) => {
      let changed = false;
      const next = prev.map((tag) => {
        const nextCount = counts[tag.name] || 0;
        if ((Number(tag.documentCount) || 0) !== nextCount) {
          changed = true;
          return { ...tag, documentCount: nextCount };
        }
        return tag;
      });
      return changed ? next : prev;
    });
  }, [documents]);

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-border/70 bg-card p-5 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.16)] dark:bg-black/20 dark:shadow-[0_24px_60px_-42px_rgba(2,6,23,0.7)] md:p-6">
      <div className="relative">
        <div className="documents-header mb-6 flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 text-white shadow-[0_18px_40px_-22px_rgba(244,63,94,0.65)] dark:text-slate-950">
                <Icon name="FolderOpen" size={20} />
              </div>
              <div>
                <div className="mb-1 text-[11px] font-black uppercase tracking-[0.22em] text-rose-500 dark:text-rose-300">
                  Post-File Control
                </div>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Centralize synced customer records, additional uploads, and document tagging in one review-friendly workspace.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-2 rounded-2xl border border-rose-200/70 bg-white/85 p-2 shadow-sm dark:border-rose-900/50 dark:bg-white/5 lg:justify-end">
              <Button
                variant="outline"
                iconName="RefreshCw"
                iconPosition="left"
                size="sm"
                onClick={() => fetchCustomerDocuments(true)}
                isLoading={isFetchingDocs}
                className="h-10 rounded-xl border-rose-200 bg-white px-4 text-rose-700 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900/60 dark:bg-transparent dark:text-rose-200 dark:hover:bg-rose-500/10"
              >
                Sync Docs
              </Button>
              <Button
                variant="outline"
                iconName="Tag"
                iconPosition="left"
                size="sm"
                onClick={() => setShowAddTagsModal(true)}
                className="h-10 rounded-xl border-sky-200 bg-white px-4 text-sky-700 hover:border-sky-300 hover:bg-sky-50 dark:border-sky-900/60 dark:bg-transparent dark:text-sky-200 dark:hover:bg-sky-500/10"
              >
                Tag
              </Button>
              {documents.length > 0 && (
                <Button
                  variant="outline"
                  iconName="Eye"
                  iconPosition="left"
                  size="sm"
                  onClick={() => setShowAllDocumentsModal(true)}
                  className="h-10 rounded-xl border-slate-200 bg-white px-4 hover:bg-slate-50 dark:border-slate-800 dark:bg-transparent dark:hover:bg-white/10"
                >
                  View All
                </Button>
              )}
              <Button
                variant="default"
                iconName="Upload"
                iconPosition="left"
                size="sm"
                onClick={() => setShowUploadModal(true)}
                className="h-10 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 px-4 text-white shadow-[0_16px_34px_-18px_rgba(244,63,94,0.6)] hover:opacity-95 dark:text-slate-950"
              >
                Add Document
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 shadow-sm dark:border-slate-800/90 dark:bg-white/5">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Total Documents
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {documents.length}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 shadow-sm dark:border-emerald-900/70 dark:bg-emerald-500/10">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">
                Tagged
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-emerald-800 dark:text-emerald-100">
                {taggedCount}
              </div>
            </div>
            <div className="rounded-2xl border border-sky-200/80 bg-sky-50/90 px-4 py-3 shadow-sm dark:border-sky-900/70 dark:bg-sky-500/10">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">
                Needs Tagging
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-sky-800 dark:text-sky-100">
                {untaggedCount}
              </div>
            </div>
            <div className="rounded-2xl border border-sky-200/80 bg-sky-50/90 px-4 py-3 shadow-sm dark:border-sky-900/70 dark:bg-sky-500/10">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">
                Additional Uploads
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-sky-800 dark:text-sky-100">
                {uploadedCount}
              </div>
            </div>
          </div>
        </div>

        {(tags.length > 0 || documents.length > 0) && (
          <div className="mb-4 rounded-[24px] border border-border/70 bg-muted/20 p-4 shadow-sm dark:bg-white/5 md:mb-6">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-500 dark:text-rose-300">
                  Tag Vault
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Organize the file stack with structured tags for audit and retrieval.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                {vaultTags.length} active tag{vaultTags.length !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedTagFilter("All")}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs shadow-sm transition-colors ${
                  selectedTagFilter === "All"
                    ? "border-rose-300 bg-rose-500 text-white dark:text-slate-950"
                    : "border-border/70 bg-card hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                }`}
              >
                <Icon name="Files" size={12} />
                <span className="font-semibold">All</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${selectedTagFilter === "All" ? "bg-white/20 text-white dark:text-slate-950" : "bg-rose-500/10 text-rose-700 dark:text-rose-200"}`}>
                  {documents.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTagFilter("Untagged")}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs shadow-sm transition-colors ${
                  selectedTagFilter === "Untagged"
                    ? "border-sky-300 bg-sky-500 text-white dark:text-slate-950"
                    : "border-sky-200/80 bg-sky-50/80 hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-500/10 dark:hover:bg-sky-500/15"
                }`}
              >
                <Icon name="AlertCircle" size={12} />
                <span className="font-semibold">Untagged</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${selectedTagFilter === "Untagged" ? "bg-white/20 text-white dark:text-slate-950" : "bg-sky-500/10 text-sky-700 dark:text-sky-200"}`}>
                  {untaggedCount}
                </span>
              </button>

              {vaultTags.map((tag) => (
                <div
                  key={tag.id}
                  className={`inline-flex items-center gap-2 rounded-full border px-1.5 py-1.5 text-xs shadow-sm transition-colors ${
                    selectedTagFilter === tag.name
                      ? "border-rose-300 bg-rose-500 text-white dark:text-slate-950"
                      : "border-rose-200/80 bg-gradient-to-r from-white to-rose-50 dark:border-rose-900/50 dark:from-white/10 dark:to-rose-500/10"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedTagFilter(tag.name)}
                    className="inline-flex items-center gap-2 rounded-full px-2 py-0.5"
                  >
                    <Icon
                      name="Tag"
                      size={12}
                      className={selectedTagFilter === tag.name ? "text-white dark:text-slate-950" : "text-rose-500 dark:text-rose-300"}
                    />
                    <span className={selectedTagFilter === tag.name ? "font-semibold text-white dark:text-slate-950" : "font-semibold text-foreground"}>
                      {tag.name}
                    </span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${selectedTagFilter === tag.name ? "bg-white/20 text-white dark:text-slate-950" : "bg-rose-500/10 text-rose-700 dark:text-rose-200"}`}>
                      {tag.liveCount}
                    </span>
                  </button>
                  <button
                    onClick={() => deleteTag(tag.id)}
                    className={`ml-1 rounded-full p-1 transition-colors ${
                      selectedTagFilter === tag.name
                        ? "text-white/80 hover:bg-white/15 hover:text-white dark:text-slate-950/80 dark:hover:text-slate-950"
                        : "text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-300"
                    }`}
                  >
                    <Icon name="X" size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {untaggedCount > 0 && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50 via-cyan-50 to-transparent p-4 dark:border-sky-900/60 dark:from-sky-500/10 dark:via-cyan-500/5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-700 dark:text-sky-200">
              <Icon name="AlertCircle" size={16} />
            </div>
            <div className="text-xs">
              <p className="font-semibold text-sky-800 dark:text-sky-100">
                {untaggedCount} document(s) not tagged
              </p>
              <p className="mt-1 text-sky-700/85 dark:text-sky-100/80">
                Please assign tags to all uploaded documents.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 md:space-y-5">
          {filteredDocuments.map((doc, index) => (
            <div
              key={getStableDocId(doc, `doc_${index}`)}
              className="group rounded-[24px] border border-border/70 bg-white/80 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-[0_22px_50px_-34px_rgba(244,63,94,0.28)] dark:bg-white/5 dark:hover:border-rose-900/60"
            >
              <div className="flex flex-col gap-4 lg:flex-row">
                <div
                  className="relative h-32 w-full shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-border/70 bg-muted lg:h-28 lg:w-28"
                  onClick={() => setViewDocument(doc)}
                >
                  {doc.url &&
                  !doc.url.toLowerCase().endsWith(".pdf") &&
                  doc.format !== "pdf" ? (
                    <img
                      src={doc.url}
                      alt={getDocDisplayLabel(doc, index)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-500/10 via-transparent to-sky-500/10">
                      <Icon
                        name={doc.url?.toLowerCase().endsWith(".pdf") ? "FileText" : "File"}
                        size={32}
                        className={doc.url ? "text-rose-500 dark:text-rose-300" : "text-muted-foreground"}
                      />
                      {doc.url?.toLowerCase().endsWith(".pdf") && (
                        <span className="absolute bottom-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white dark:text-slate-950">
                          PDF
                        </span>
                      )}
                    </div>
                  )}
                  {doc.isPreFile && (
                    <span className="absolute left-2 top-2 rounded-full bg-sky-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white dark:text-slate-950">
                      Synced
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-1 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/15 to-orange-400/15 text-rose-600 dark:text-rose-300">
                        <Icon name="FileText" size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-sm font-semibold text-foreground md:text-base">
                            {getDocDisplayLabel(doc, index)}
                          </h4>
                          <span className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                            {doc.format || "file"}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="rounded-full bg-muted/60 px-2.5 py-1">{doc.size}</span>
                          <span className="rounded-full bg-muted/60 px-2.5 py-1">{doc.uploadedBy}</span>
                          <span className="rounded-full bg-muted/60 px-2.5 py-1">{doc.uploadedAt}</span>
                        </div>

                        <div className="mt-3">
                          {doc.tag ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-500/10 dark:text-emerald-200">
                                <Icon name="Tag" size={12} className="text-emerald-600 dark:text-emerald-300" />
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
                                }}
                                className="rounded-full border border-border/70 px-2 py-1 text-[11px] text-muted-foreground transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                              >
                                Remove tag
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

                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <Button
                        variant="outline"
                        iconName="Eye"
                        iconPosition="left"
                        size="sm"
                        onClick={() => setViewDocument(doc)}
                        className="h-10 rounded-xl border-slate-200 bg-white px-4 hover:bg-slate-50 dark:border-slate-800 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        iconName="Download"
                        iconPosition="left"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = doc.url;
                          link.download = getDocDisplayLabel(doc, index)
                            .replace(/\s+/g, "_")
                            .toLowerCase();
                          link.click();
                        }}
                        className="h-10 rounded-xl border-sky-200 bg-sky-50 px-4 text-sky-700 hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:bg-sky-500/15"
                      >
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        iconName="Trash2"
                        iconPosition="left"
                        size="sm"
                        onClick={() => deleteDocument(doc.id)}
                        className="h-10 rounded-xl border-rose-200 bg-rose-50 px-4 text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {documents.length === 0 && (
            <div className="overflow-hidden rounded-[28px] border border-dashed border-rose-200/80 bg-gradient-to-br from-white via-rose-50/70 to-orange-50/60 px-6 py-14 text-center shadow-inner dark:border-rose-900/60 dark:from-white/5 dark:via-rose-500/5 dark:to-orange-500/5 md:px-10 md:py-16">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-rose-500/15 to-orange-400/15 text-rose-600 shadow-sm dark:text-rose-300">
                <Icon name="FolderOpen" size={34} />
              </div>
              <p className="text-lg font-semibold text-foreground">
                No documents uploaded yet
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Start by syncing customer records or upload fresh post-file documents for verification and dispatch.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="default"
                  iconName="Upload"
                  iconPosition="left"
                  size="sm"
                  onClick={() => setShowUploadModal(true)}
                  className="h-11 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 px-5 text-white shadow-[0_18px_40px_-22px_rgba(244,63,94,0.6)] hover:opacity-95 dark:text-slate-950"
                >
                  Add Document
                </Button>
                <Button
                  variant="outline"
                  iconName="RefreshCw"
                  iconPosition="left"
                  size="sm"
                  onClick={() => fetchCustomerDocuments(true)}
                  isLoading={isFetchingDocs}
                  className="h-11 rounded-xl border-rose-200 bg-white px-5 text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:bg-transparent dark:text-rose-200 dark:hover:bg-rose-500/10"
                >
                  Sync Docs
                </Button>
                <Button
                  variant="outline"
                  iconName="Tag"
                  iconPosition="left"
                  size="sm"
                  onClick={() => setShowAddTagsModal(true)}
                  className="h-11 rounded-xl border-sky-200 bg-white px-5 text-sky-700 hover:bg-sky-50 dark:border-sky-900/60 dark:bg-transparent dark:text-sky-200 dark:hover:bg-sky-500/10"
                >
                  Tag
                </Button>
              </div>
            </div>
          )}

          {documents.length > 0 && filteredDocuments.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Icon name="Filter" size={24} />
              </div>
              <p className="text-base font-semibold text-foreground">
                No documents in this filter
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Switch the tag filter to view other files.
              </p>
            </div>
          )}
        </div>

        {viewDocument && (
          <LoanDocumentViewerModal
            open={Boolean(viewDocument)}
            title="Post-File Document Viewer"
            documents={documents}
            currentIndex={viewerIndex}
            onIndexChange={(idx) => setViewDocument(documents[idx])}
            onClose={() => setViewDocument(null)}
          />
        )}

        {showAllDocumentsModal && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-border bg-card shadow-elevation-4">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/15 to-orange-400/15 text-rose-600 dark:text-rose-300">
                    <Icon name="FolderOpen" size={18} />
                  </div>
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-rose-500 dark:text-rose-300">
                      All Documents
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {documents.length} files in the ledger
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowAllDocumentsModal(false)}
                  className="rounded-xl p-2 transition hover:bg-muted"
                >
                  <Icon name="X" size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-5">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {documents.map((doc, index) => (
                    <div
                      key={getStableDocId(doc, `all_${index}`)}
                      className="overflow-hidden rounded-[22px] border border-border bg-white/80 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:bg-white/5"
                      onClick={() => {
                        setViewDocument(doc);
                        setShowAllDocumentsModal(false);
                      }}
                    >
                      <div className="aspect-square bg-muted flex items-center justify-center">
                        {doc.url ? (
                          <img
                            src={doc.url}
                            alt={getDocDisplayLabel(doc, index)}
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
                      <div className="bg-card p-3.5">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {getDocDisplayLabel(doc, index)}
                        </p>
                        {doc.tag && (
                          <div className="mt-2">
                            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                              <Icon name="Tag" size={10} />
                              {doc.tag}
                            </span>
                          </div>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                          {doc.size}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
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

        {showAddTagsModal && (
          <AddTagsModal
            availableTags={availableTags}
            existingTags={tags.map((t) => t.name)}
            onAdd={addTags}
            onClose={() => setShowAddTagsModal(false)}
          />
        )}

        {showUploadModal && (
          <LoanDocumentUploadModal
            open={showUploadModal}
            title="Upload Documents"
            onUpload={uploadDocuments}
            onClose={() => setShowUploadModal(false)}
            uploading={uploading}
            progress={uploadProgress}
            multiple
          />
        )}

        {documents.length > 0 && (
          <div className="mt-5 border-t border-border/70 pt-5 md:mt-6 md:pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-3">
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-200">
                  Tagged: <span className="font-semibold">{taggedCount}</span>
                </div>
                <div className="rounded-xl border border-sky-200/80 bg-sky-50 px-3 py-2 text-xs text-sky-700 dark:border-sky-900/60 dark:bg-sky-500/10 dark:text-sky-200">
                  Untagged: <span className="font-semibold">{untaggedCount}</span>
                </div>
                <div className="rounded-xl border border-sky-200/80 bg-sky-50 px-3 py-2 text-xs text-sky-700 dark:border-sky-900/60 dark:bg-sky-500/10 dark:text-sky-200">
                  Synced: <span className="font-semibold">{preFileCount}</span>
                </div>
              </div>
              <Button
                variant="outline"
                iconName="Download"
                iconPosition="left"
                size="sm"
                className="h-10 rounded-xl border-slate-200 bg-white px-4 hover:bg-slate-50 dark:border-slate-800 dark:bg-white/5 dark:hover:bg-white/10"
              >
                Export All
              </Button>
            </div>
          </div>
        )}
      </div>
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
          className="w-full rounded-xl border border-sky-200/80 bg-sky-50/60 px-3 py-2 text-xs pr-8 shadow-sm outline-none transition placeholder:text-sky-700/45 focus:border-sky-300 focus:bg-white dark:border-sky-900/60 dark:bg-sky-500/10 dark:placeholder:text-sky-200/45 dark:focus:bg-white/5"
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
          className="absolute right-2 top-1/2 -translate-y-1/2 text-sky-600 dark:text-sky-300"
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredTags.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-2xl border border-sky-200/80 bg-card shadow-lg dark:border-sky-900/60">
            {filteredTags.map((tag, index) => (
              <div
                key={index}
                className={`flex cursor-pointer items-center gap-2 border-b border-border/10 px-3 py-2 text-xs hover:brightness-95 last:border-0 ${getTagColor(tag)}`}
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
        className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50 dark:text-slate-950"
        disabled={!inputValue.trim()}
      >
        Tag
      </button>
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
      <div className="w-full max-w-3xl rounded-[28px] border border-sky-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,250,255,0.96))] shadow-elevation-4 dark:border-sky-900/60 dark:bg-[linear-gradient(180deg,rgba(10,10,10,0.98),rgba(8,18,28,0.96))]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/15 to-cyan-400/15 text-sky-700 dark:text-sky-300">
              <Icon name="Tag" size={18} />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Add Document Tags
              </div>
              <div className="text-sm font-semibold text-foreground">
                Build reusable tags for document classification
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-muted">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
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
                    className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                      alreadyExists
                        ? "bg-muted/50 text-muted-foreground border-border cursor-not-allowed opacity-50"
                        : isSelected
                        ? `${getTagColor(tag)} ring-2 ring-offset-1 ring-primary border-transparent font-semibold shadow-sm`
                        : `${getTagColor(tag)} hover:brightness-95 border-transparent/20`
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {tag}
                      {alreadyExists && (
                        <span className="text-[10px]">✓</span>
                      )}
                      {isSelected && !alreadyExists && (
                        <Icon name="Check" size={10} />
                      )}
                    </span>
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
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
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
              <Button size="sm" onClick={addCustomTag} className="rounded-xl">
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

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={selectedTags.length === 0}
            className="rounded-xl"
          >
            Add {selectedTags.length} Tag{selectedTags.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PostFileDocumentManagement;
