import React from "react";
import {
  Button,
  Card,
  Divider,
  Empty,
  Row,
  Col,
  Space,
  Spin,
  Typography,
} from "antd";
import { DownloadOutlined, CheckOutlined } from "@ant-design/icons";
import JsPDF from "jspdf";
import "jspdf-autotable";

const { Title, Text } = Typography;

/**
 * Step5PremiumBreakup
 * Displays detailed pricing breakdown of the accepted insurance quote
 * Allows user to accept the premium or download/share PDF
 */
const Step5PremiumBreakup = ({
  acceptedQuote,
  acceptedQuoteBreakup,
  toINR,
}) => {
  if (!acceptedQuote || !acceptedQuoteBreakup) {
    return (
      <Empty description="No Accepted Quote" style={{ marginTop: "2rem" }} />
    );
  }

  const {
    insuranceCompany,
    coverageType,
    vehicleIdv,
    cngIdv,
    accessoriesIdv,
    policyDuration,
    ncbDiscount,
    odAmount,
    thirdPartyAmount,
    addOnsAmount,
    addOns,
    addOnsIncluded,
  } = acceptedQuote;

  const {
    totalIdv,
    odAmt,
    tpAmt,
    basePremium,
    ncbAmount,
    taxableAmount,
    gstAmount,
    totalPremium,
    addOnLines,
  } = acceptedQuoteBreakup;

  const zone = acceptedQuote?.zone || "N/A";

  /**
   * Generate and download PDF of premium breakup
   */
  const handleDownloadPDF = () => {
    try {
      const doc = new JsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      let yPosition = margin;

      // Header
      doc.setFontSize(16);
      doc.text("Insurance Premium Breakup", margin, yPosition);
      yPosition += 10;

      // Company & IDV info
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text(`Insurance Company: ${insuranceCompany}`, margin, yPosition);
      yPosition += 6;
      doc.text(`IDV Amount: ${toINR(totalIdv)}`, margin, yPosition);
      yPosition += 6;
      doc.text(`Zone: ${zone}`, margin, yPosition);
      yPosition += 6;
      doc.text(`Policy Duration: ${policyDuration}`, margin, yPosition);
      doc.text(
        `Coverage Type: ${coverageType}`,
        pageWidth - margin - 50,
        yPosition,
      );
      yPosition += 12;

      // OD Section
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("OWN DAMAGE (OD)", margin, yPosition);
      yPosition += 8;

      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      doc.text(
        `Basic Own Damage Premium: ${toINR(odAmt)}`,
        margin + 5,
        yPosition,
      );
      yPosition += 6;
      if (ncbDiscount > 0) {
        doc.text(
          `NCB Discount (${ncbDiscount}%): -${toINR(ncbAmount)}`,
          margin + 5,
          yPosition,
        );
        yPosition += 6;
      }
      doc.text(
        `OD Premium after Discount: ${toINR(odAmt - ncbAmount)}`,
        margin + 5,
        yPosition,
      );
      yPosition += 10;

      // TP Section
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text("THIRD PARTY (TP)", margin, yPosition);
      yPosition += 8;

      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      doc.text(
        `Basic Third Party Premium: ${toINR(tpAmt)}`,
        margin + 5,
        yPosition,
      );
      yPosition += 6;
      doc.text(`Personal Accident Cover (Fixed): ₹330`, margin + 5, yPosition);
      yPosition += 6;
      doc.text(`Paid Driver + Cleaner (Fixed): ₹50`, margin + 5, yPosition);
      yPosition += 10;

      // Add-ons Section
      if (addOnLines && addOnLines.length > 0) {
        doc.setFont(undefined, "bold");
        doc.setFontSize(12);
        doc.text("SELECTED ADD-ONS", margin, yPosition);
        yPosition += 8;

        doc.setFont(undefined, "normal");
        doc.setFontSize(10);
        addOnLines.forEach((addon) => {
          doc.text(
            `${addon.name}: ${toINR(addon.amount)}`,
            margin + 5,
            yPosition,
          );
          yPosition += 6;
        });
        yPosition += 4;
      }

      // Summary Section
      yPosition += 4;
      doc.setDrawColor(200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      doc.setFont(undefined, "bold");
      doc.setFontSize(11);
      doc.text(
        `Base Premium (OD + TP + Add-ons): ${toINR(basePremium)}`,
        margin,
        yPosition,
      );
      yPosition += 7;

      if (ncbDiscount > 0) {
        doc.text(
          `Less: NCB Discount (${ncbDiscount}%): -${toINR(ncbAmount)}`,
          margin,
          yPosition,
        );
        yPosition += 7;
      }

      doc.text(`Taxable Amount: ${toINR(taxableAmount)}`, margin, yPosition);
      yPosition += 7;
      doc.text(`GST (18%): ${toINR(gstAmount)}`, margin, yPosition);
      yPosition += 10;

      doc.setDrawColor(200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(`TOTAL PREMIUM: ${toINR(totalPremium)}`, margin, yPosition, {
        maxWidth: pageWidth - 2 * margin,
      });

      // Footer
      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      doc.setTextColor(128);
      doc.text(
        `Generated on ${new Date().toLocaleDateString()}`,
        margin,
        doc.internal.pageSize.getHeight() - 10,
      );

      doc.save(`premium-breakup-${insuranceCompany.replace(/\s+/g, "-")}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF");
    }
  };

  return (
    <div className="space-y-6">
      {/* OWN DAMAGE Section */}
      <Card className="border-l-4 border-l-sky-500">
        <Title level={5} className="!mb-4 flex items-center gap-2">
          🛡️ OWN DAMAGE (OD)
        </Title>
        <div className="space-y-3">
          <div className="flex justify-between p-3 bg-slate-50 rounded">
            <span className="font-medium">OD Premium Price</span>
            <span className="font-semibold">{toINR(odAmt)}</span>
          </div>
          <div className="pl-4 space-y-2 text-sm">
            <div>
              <Text type="secondary">Basic Own Damage (Zone/CC/Age based)</Text>
              <div className="flex justify-between mt-1">
                <span></span>
                <span>{toINR(odAmt)}</span>
              </div>
            </div>
            {ncbDiscount > 0 && (
              <div className="pt-2 border-t border-slate-200">
                <Text type="secondary">NCB Discount ({ncbDiscount}%)</Text>
                <div className="flex justify-between mt-1 text-green-700">
                  <span></span>
                  <span>-{toINR(ncbAmount)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* THIRD PARTY Section */}
      <Card className="border-l-4 border-l-amber-500">
        <Title level={5} className="!mb-4 flex items-center gap-2">
          🚗 THIRD PARTY (TP)
        </Title>
        <div className="space-y-3">
          <div className="flex justify-between p-3 bg-slate-50 rounded">
            <span className="font-medium">Third Party Premium Price</span>
            <span className="font-semibold">{toINR(tpAmt)}</span>
          </div>
          <div className="pl-4 space-y-2 text-sm">
            <div>
              <Text type="secondary">Basic Third Party (Engine CC based)</Text>
              <div className="flex justify-between mt-1">
                <span></span>
                <span>{toINR(tpAmt)}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <Text type="secondary">Personal Accident Cover (Fixed)</Text>
              <div className="flex justify-between mt-1">
                <span></span>
                <span>₹330</span>
              </div>
            </div>
            <div>
              <Text type="secondary">Paid Driver + Cleaner (Fixed)</Text>
              <div className="flex justify-between mt-1">
                <span></span>
                <span>₹50</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ADD-ONS Section (if any selected) */}
      {addOnLines && addOnLines.length > 0 && (
        <Card className="border-l-4 border-l-purple-500">
          <Title level={5} className="!mb-4 flex items-center gap-2">
            ⭐ SELECTED ADD-ONS
          </Title>
          <div className="space-y-2">
            {addOnLines.map((addon, idx) => (
              <div
                key={idx}
                className="flex justify-between p-3 bg-purple-50 rounded border border-purple-100"
              >
                <span className="font-medium">{addon.name}</span>
                <span className="font-semibold text-purple-700">
                  {toINR(addon.amount)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Electrical & Non-Electrical Accessories (if applicable) */}
      {(accessoriesIdv > 0 || cngIdv > 0) && (
        <Card className="border-l-4 border-l-teal-500">
          <Title level={5} className="!mb-4 flex items-center gap-2">
            🔧 ACCESSORIES & CNG
          </Title>
          <div className="space-y-2">
            {cngIdv > 0 && (
              <div className="flex justify-between p-3 bg-teal-50 rounded border border-teal-100">
                <span className="font-medium">CNG Kit (4%)</span>
                <span className="font-semibold text-teal-700">
                  {toINR(cngIdv * 0.04)}
                </span>
              </div>
            )}
            {accessoriesIdv > 0 && (
              <div className="flex justify-between p-3 bg-teal-50 rounded border border-teal-100">
                <span className="font-medium">Accessories (4%)</span>
                <span className="font-semibold text-teal-700">
                  {toINR(accessoriesIdv * 0.04)}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Premium Calculation Summary */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-300">
        <Title level={5} className="!mb-4">
          📊 PREMIUM CALCULATION
        </Title>
        <div className="space-y-3">
          <div className="flex justify-between p-3 bg-white rounded border border-green-100">
            <span>Base Premium (OD + TP + Add-ons)</span>
            <span className="font-semibold">{toINR(basePremium)}</span>
          </div>
          {ncbDiscount > 0 && (
            <div className="flex justify-between p-3 bg-green-100 rounded border border-green-300">
              <span className="font-medium">
                Less: NCB Discount ({ncbDiscount}%)
              </span>
              <span className="font-semibold text-green-700">
                -{toINR(ncbAmount)}
              </span>
            </div>
          )}
          <div className="flex justify-between p-3 bg-white rounded border border-green-100">
            <span>Taxable Amount</span>
            <span className="font-semibold">{toINR(taxableAmount)}</span>
          </div>
          <div className="flex justify-between p-3 bg-orange-50 rounded border border-orange-200">
            <span className="font-medium">GST (18%)</span>
            <span className="font-semibold text-orange-700">
              {toINR(gstAmount)}
            </span>
          </div>
          <Divider className="!my-3" />
          <div className="flex justify-between p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded border-2 border-green-500">
            <span className="text-lg font-bold">TOTAL PREMIUM</span>
            <span className="text-2xl font-bold text-green-700">
              {toINR(totalPremium)}
            </span>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <Row gutter={16} className="mt-8">
        <Col xs={24} sm={12}>
          <Button
            block
            size="large"
            icon={<DownloadOutlined />}
            onClick={handleDownloadPDF}
            className="!h-12"
          >
            Download Premium Breakup PDF
          </Button>
        </Col>
        <Col xs={24} sm={12}>
          <Button
            block
            size="large"
            type="primary"
            icon={<CheckOutlined />}
            className="!h-12 !bg-green-600 !hover:bg-green-700"
          >
            Share Quotes
          </Button>
        </Col>
      </Row>
    </div>
  );
};

export default Step5PremiumBreakup;
