import React, { useMemo, useState } from "react";
import { Form } from "antd";
import Icon from "../../../../../components/AppIcon";
import Button from "../../../../../components/ui/Button";

/**
 * Comprehensive Documents List
 * Displays all uploaded documents organized by category
 * Shows below Record Details in Post-File
 */
const DocumentsList = ({ form }) => {
  const [expandedCategories, setExpandedCategories] = useState(["kyc", "vehicle"]);

  // Watch specific document fields from form (prevent unnecessary re-renders)
  const aadhaarCardDocUrl = Form.useWatch("aadhaarCardDocUrl", form);
  const panCardDocUrl = Form.useWatch("panCardDocUrl", form);
  const passportDocUrl = Form.useWatch("passportDocUrl", form);
  const dlDocUrl = Form.useWatch("dlDocUrl", form);
  const addressProofDocUrl = Form.useWatch("addressProofDocUrl", form);
  const gstDocUrl = Form.useWatch("gstDocUrl", form);
  
  const co_aadhaarCardDocUrl = Form.useWatch("co_aadhaarCardDocUrl", form);
  const co_panCardDocUrl = Form.useWatch("co_panCardDocUrl", form);
  const co_passportDocUrl = Form.useWatch("co_passportDocUrl", form);
  const co_dlDocUrl = Form.useWatch("co_dlDocUrl", form);
  const co_addressProofDocUrl = Form.useWatch("co_addressProofDocUrl", form);
  
  const gu_aadhaarCardDocUrl = Form.useWatch("gu_aadhaarCardDocUrl", form);
  const gu_panCardDocUrl = Form.useWatch("gu_panCardDocUrl", form);
  const gu_passportDocUrl = Form.useWatch("gu_passportDocUrl", form);
  const gu_dlDocUrl = Form.useWatch("gu_dlDocUrl", form);
  const gu_addressProofDocUrl = Form.useWatch("gu_addressProofDocUrl", form);
  
  const vehiclePhotoUrl = Form.useWatch("vehiclePhotoUrl", form);
  const vehicleRCUrl = Form.useWatch("vehicleRCUrl", form);
  const insurancePolicyUrl = Form.useWatch("insurancePolicyUrl", form);
  const hypothecationDocUrl = Form.useWatch("hypothecationDocUrl", form);
  
  const delivery_invoiceFile = Form.useWatch("delivery_invoiceFile", form);
  const delivery_rcFile = Form.useWatch("delivery_rcFile", form);
  
  const postfile_documents = Form.useWatch("postfile_documents", form);

  // Aggregate all watched values into an object
  const formValues = useMemo(() => ({
    aadhaarCardDocUrl,
    panCardDocUrl,
    passportDocUrl,
    dlDocUrl,
    addressProofDocUrl,
    gstDocUrl,
    co_aadhaarCardDocUrl,
    co_panCardDocUrl,
    co_passportDocUrl,
    co_dlDocUrl,
    co_addressProofDocUrl,
    gu_aadhaarCardDocUrl,
    gu_panCardDocUrl,
    gu_passportDocUrl,
    gu_dlDocUrl,
    gu_addressProofDocUrl,
    vehiclePhotoUrl,
    vehicleRCUrl,
    insurancePolicyUrl,
    hypothecationDocUrl,
    delivery_invoiceFile,
    delivery_rcFile,
    postfile_documents,
  }), [
    aadhaarCardDocUrl, panCardDocUrl, passportDocUrl, dlDocUrl, addressProofDocUrl, gstDocUrl,
    co_aadhaarCardDocUrl, co_panCardDocUrl, co_passportDocUrl, co_dlDocUrl, co_addressProofDocUrl,
    gu_aadhaarCardDocUrl, gu_panCardDocUrl, gu_passportDocUrl, gu_dlDocUrl, gu_addressProofDocUrl,
    vehiclePhotoUrl, vehicleRCUrl, insurancePolicyUrl, hypothecationDocUrl,
    delivery_invoiceFile, delivery_rcFile, postfile_documents,
  ]);

  // Document categories and field mappings
  const documentCategories = useMemo(() => {
    return [
      {
        id: "kyc",
        title: "KYC Documents",
        icon: "FileText",
        color: "emerald",
        fields: [
          { key: "aadhaarCardDocUrl", label: "Aadhaar Card", icon: "CreditCard" },
          { key: "panCardDocUrl", label: "PAN Card", icon: "CreditCard" },
          { key: "passportDocUrl", label: "Passport", icon: "Globe" },
          { key: "dlDocUrl", label: "Driving License", icon: "Car" },
          { key: "addressProofDocUrl", label: "Address Proof", icon: "Home" },
          { key: "gstDocUrl", label: "GST Certificate", icon: "FileCheck" },
        ],
      },
      {
        id: "co-applicant",
        title: "Co-Applicant Documents",
        icon: "Users",
        color: "blue",
        fields: [
          { key: "co_aadhaarCardDocUrl", label: "Co-App Aadhaar", icon: "CreditCard" },
          { key: "co_panCardDocUrl", label: "Co-App PAN", icon: "CreditCard" },
          { key: "co_passportDocUrl", label: "Co-App Passport", icon: "Globe" },
          { key: "co_dlDocUrl", label: "Co-App DL", icon: "Car" },
          { key: "co_addressProofDocUrl", label: "Co-App Address Proof", icon: "Home" },
        ],
      },
      {
        id: "guarantor",
        title: "Guarantor Documents",
        icon: "Shield",
        color: "purple",
        fields: [
          { key: "gu_aadhaarCardDocUrl", label: "Guarantor Aadhaar", icon: "CreditCard" },
          { key: "gu_panCardDocUrl", label: "Guarantor PAN", icon: "CreditCard" },
          { key: "gu_passportDocUrl", label: "Guarantor Passport", icon: "Globe" },
          { key: "gu_dlDocUrl", label: "Guarantor DL", icon: "Car" },
          { key: "gu_addressProofDocUrl", label: "Guarantor Address Proof", icon: "Home" },
        ],
      },
      {
        id: "vehicle",
        title: "Vehicle Documents",
        icon: "Car",
        color: "amber",
        fields: [
          { key: "vehiclePhotoUrl", label: "Vehicle Photo", icon: "Image" },
          { key: "vehicleRCUrl", label: "RC Book", icon: "FileText" },
          { key: "insurancePolicyUrl", label: "Insurance Policy", icon: "Shield" },
          { key: "hypothecationDocUrl", label: "Hypothecation Doc", icon: "FileCheck" },
        ],
      },
      {
        id: "delivery",
        title: "Delivery Documents",
        icon: "Truck",
        color: "indigo",
        fields: [
          { key: "delivery_invoiceFile", label: "Invoice", icon: "Receipt" },
          { key: "delivery_rcFile", label: "RC Copy", icon: "FileText" },
        ],
      },
      {
        id: "postfile",
        title: "Post-File Documents",
        icon: "FolderOpen",
        color: "rose",
        fields: [
          { key: "postfile_documents", label: "Additional Documents", icon: "Paperclip", isArray: true },
        ],
      },
    ];
  }, []);

  // Extract documents by category
  const documentsByCategory = useMemo(() => {
    return documentCategories.map((category) => {
      const docs = category.fields
        .map((field) => {
          const value = formValues[field.key];
          
          // Handle array fields (like postfile_documents)
          if (field.isArray && Array.isArray(value)) {
            return value.map((item, index) => {
              const itemUrl = typeof item === 'object' && item ? (item.url || item.secure_url) : item;
              const itemName = (typeof item === 'object' && item?.name) ? item.name : `${field.label} ${index + 1}`;
              
              return {
                key: `${field.key}_${index}`,
                label: itemName,
                icon: field.icon,
                url: itemUrl,
                uploaded: !!itemUrl,
              };
            });
          }
          
          // Handle single file fields
          return {
            key: field.key,
            label: field.label,
            icon: field.icon,
            url: value,
            uploaded: !!value,
          };
        })
        .flat()
        .filter((doc) => doc.uploaded); // Only show uploaded documents

      return {
        ...category,
        documents: docs,
        count: docs.length,
      };
    });
  }, [documentCategories, formValues]);

  // Total documents count
  const totalDocuments = useMemo(() => {
    return documentsByCategory.reduce((sum, cat) => sum + cat.count, 0);
  }, [documentsByCategory]);

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleDownload = (url, filename) => {
    // Open in new tab for cloud URLs
    if (url.startsWith('http')) {
      window.open(url, '_blank');
    } else {
      // For blob URLs, trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'document';
      a.click();
    }
  };

  const getFileIcon = (url) => {
    if (!url || typeof url !== 'string') return "File";
    const parts = url.split('.');
    if (parts.length < 2) return "File";
    const ext = parts.pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return "Image";
    if (['pdf'].includes(ext)) return "FileText";
    if (['doc', 'docx'].includes(ext)) return "FileText";
    if (['xls', 'xlsx'].includes(ext)) return "Table";
    return "File";
  };

  const getColorClasses = () =>
    "bg-muted/30 border-border text-foreground";

  if (totalDocuments === 0) {
    return (
      <div className="bg-card rounded-lg border border-dashed border-muted p-6 text-center">
        <Icon name="FolderOpen" size={40} className="text-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-1">No documents uploaded yet</p>
        <p className="text-xs text-muted-foreground">
          Upload documents in Pre-File and Post-File stages
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
            <Icon name="FolderOpen" size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-foreground">
              Documents Library
            </h3>
            <p className="text-xs text-muted-foreground">
              {totalDocuments} document{totalDocuments !== 1 ? 's' : ''} uploaded across {documentsByCategory.filter(c => c.count > 0).length} categories
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="small"
            onClick={() => {
              const allCategoryIds = documentsByCategory.map(c => c.id);
              setExpandedCategories(
                expandedCategories.length === allCategoryIds.length ? [] : allCategoryIds
              );
            }}
          >
            <Icon 
              name={expandedCategories.length === documentsByCategory.length ? "ChevronsUp" : "ChevronsDown"} 
              size={14} 
            />
            {expandedCategories.length === documentsByCategory.length ? "Collapse All" : "Expand All"}
          </Button>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {documentsByCategory.map((category) => {
          if (category.count === 0) return null;

          const isExpanded = expandedCategories.includes(category.id);

          return (
            <div
              key={category.id}
              className={`${getColorClasses()} rounded-lg border overflow-hidden transition-all`}
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-background/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon name={category.icon} size={18} className="text-primary" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">
                      {category.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {category.count} document{category.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-2 py-0.5 bg-background/80 rounded-full">
                    <span className="text-xs font-semibold text-foreground">
                      {category.count}
                    </span>
                  </div>
                  <Icon
                    name={isExpanded ? "ChevronUp" : "ChevronDown"}
                    size={16}
                    className="text-muted-foreground"
                  />
                </div>
              </button>

              {/* Documents List */}
              {isExpanded && (
                <div className="border-t border-border/50 bg-card/50 p-3">
                  <div className="space-y-2">
                    {category.documents.map((doc) => (
                      <div
                        key={doc.key}
                        className="flex items-center justify-between p-2 bg-background rounded-md border border-border hover:border-primary/30 transition-all group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <Icon
                              name={getFileIcon(doc.url)}
                              size={14}
                              className="text-muted-foreground"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground font-medium truncate">
                              {doc.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {doc.url && typeof doc.url === 'string'
                                ? (doc.url.startsWith('blob:') 
                                   ? 'Local Preview' 
                                   : new URL(doc.url, window.location.origin).pathname.split('/').pop())
                                : 'Uploaded File'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => window.open(doc.url, '_blank')}
                            title="View"
                          >
                            <Icon name="Eye" size={14} className="text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDownload(doc.url, doc.label)}
                            title="Download"
                          >
                            <Icon name="Download" size={14} className="text-primary" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          All documents are securely stored and encrypted
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="small">
            <Icon name="Download" size={14} className="text-primary" />
            Download All
          </Button>
          <Button variant="outline" size="small" onClick={() => window.print()}>
            <Icon name="Printer" size={14} className="text-primary" />
            Print List
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DocumentsList;
