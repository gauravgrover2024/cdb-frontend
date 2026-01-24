import React, { useState } from "react";
import { Form } from "antd";
import Icon from "../../../../../components/AppIcon";
import Button from "../../../../../components/ui/Button";

const PostFileInstrumentDetails = ({ form }) => {
  const instrumentType = Form.useWatch("instrumentType", form);
  const [cheques, setCheques] = useState([{ id: 1 }]);
  const [expandedCheque, setExpandedCheque] = useState(1);

  const addCheque = () => {
    const newId = Math.max(...cheques.map((c) => c.id), 0) + 1;
    setCheques([...cheques, { id: newId }]);
  };

  const deleteCheque = (id) => {
    if (cheques.length > 1) {
      setCheques(cheques.filter((c) => c.id !== id));
      // Clear form fields for this cheque
      const fieldsToDelete = [
        `cheque_${id}_number`,
        `cheque_${id}_bankName`,
        `cheque_${id}_accountNumber`,
        `cheque_${id}_date`,
        `cheque_${id}_amount`,
        `cheque_${id}_tag`,
        `cheque_${id}_favouring`,
        `cheque_${id}_signedBy`,
      ];
      form.setFieldsValue(
        fieldsToDelete.reduce((acc, field) => {
          acc[field] = undefined;
          return acc;
        }, {})
      );
    }
  };

  const copyCheque = (fromId, toId) => {
    const fieldsToCopy = [
      "bankName",
      "accountNumber",
      "date",
      "amount",
      "tag",
      "favouring",
      "signedBy",
    ];

    const values = {};
    fieldsToCopy.forEach((field) => {
      const sourceValue = form.getFieldValue(`cheque_${fromId}_${field}`);
      values[`cheque_${toId}_${field}`] = sourceValue;
    });

    form.setFieldsValue(values);
  };

  return (
    <div className="bg-card rounded-lg shadow-elevation-2 p-4 md:p-6 h-full flex flex-col">
      {/* header */}
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon name="FileText" size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-foreground">
            Instrument Details
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Configure EMI deduction method
          </p>
        </div>
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto space-y-4 md:space-y-6 text-sm">
        {/* Instrument Type Selector */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            Select Instrument Type
          </h3>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="instrumentType"
                value="Cheque"
                checked={instrumentType === "Cheque"}
                onChange={(e) =>
                  form.setFieldsValue({ instrumentType: e.target.value })
                }
              />
              <span>Cheque</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="instrumentType"
                value="ECS"
                checked={instrumentType === "ECS"}
                onChange={(e) =>
                  form.setFieldsValue({ instrumentType: e.target.value })
                }
              />
              <span>ECS</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="instrumentType"
                value="SI"
                checked={instrumentType === "SI"}
                onChange={(e) =>
                  form.setFieldsValue({ instrumentType: e.target.value })
                }
              />
              <span>SI</span>
            </label>
          </div>
        </div>

        {/* Cheque Section */}
        {instrumentType === "Cheque" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Cheques</h3>

            <div className="space-y-3">
              {cheques.map((cheque, index) => {
                const chequeNumber = form.getFieldValue(
                  `cheque_${cheque.id}_number`
                );
                const chequeDate = form.getFieldValue(
                  `cheque_${cheque.id}_date`
                );
                const chequeAmount = form.getFieldValue(
                  `cheque_${cheque.id}_amount`
                );
                const isExpanded = expandedCheque === cheque.id;

                return (
                  <div
                    key={cheque.id}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    {/* Collapsed Header */}
                    <div
                      className="bg-muted/40 p-3 cursor-pointer flex items-center justify-between hover:bg-muted/60"
                      onClick={() =>
                        setExpandedCheque(isExpanded ? null : cheque.id)
                      }
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Icon
                          name={isExpanded ? "ChevronDown" : "ChevronRight"}
                          size={18}
                        />
                        <span className="font-semibold">
                          Cheque {index + 1}
                        </span>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          {chequeNumber && <span>#{chequeNumber}</span>}
                          {chequeDate && <span>{chequeDate}</span>}
                          {chequeAmount && (
                            <span>
                              ₹ {Number(chequeAmount).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {index > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyCheque(cheques[0].id, cheque.id);
                            }}
                            className="px-2 py-1 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20"
                          >
                            Copy from 1st
                          </button>
                        )}

                        {cheques.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCheque(cheque.id);
                            }}
                            className="px-2 py-1 text-xs bg-error/10 text-error rounded hover:bg-error/20"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="p-4 space-y-4 border-t border-border">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <Form.Item
                            label="Cheque No"
                            name={`cheque_${cheque.id}_number`}
                            className="mb-0"
                          >
                            <input
                              type="text"
                              className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                              placeholder="e.g., 123456"
                            />
                          </Form.Item>

                          <Form.Item
                            label="Bank Name"
                            name={`cheque_${cheque.id}_bankName`}
                            className="mb-0"
                          >
                            <input
                              type="text"
                              className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                              placeholder="e.g., HDFC Bank"
                            />
                          </Form.Item>

                          <Form.Item
                            label="Account Number"
                            name={`cheque_${cheque.id}_accountNumber`}
                            className="mb-0"
                          >
                            <input
                              type="text"
                              className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                              placeholder="e.g., 1234567890"
                            />
                          </Form.Item>

                          <Form.Item
                            label="Date"
                            name={`cheque_${cheque.id}_date`}
                            className="mb-0"
                          >
                            <input
                              type="date"
                              className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                            />
                          </Form.Item>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <Form.Item
                            label="Amount"
                            name={`cheque_${cheque.id}_amount`}
                            className="mb-0"
                          >
                            <input
                              type="number"
                              className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                              placeholder="e.g., 50000"
                            />
                          </Form.Item>

                          <Form.Item
                            label="Tag"
                            name={`cheque_${cheque.id}_tag`}
                            className="mb-0"
                          >
                            <input
                              type="text"
                              className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                              placeholder="e.g., EMI"
                            />
                          </Form.Item>

                          <Form.Item
                            label="Favouring"
                            name={`cheque_${cheque.id}_favouring`}
                            className="mb-0"
                          >
                            <input
                              type="text"
                              className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                              placeholder="e.g., ABC Finance"
                            />
                          </Form.Item>

                          <Form.Item
                            label="Signed By"
                            name={`cheque_${cheque.id}_signedBy`}
                            className="mb-0"
                          >
                            <select className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background">
                              <option value="">Select</option>
                              <option value="Applicant">Applicant</option>
                              <option value="Co-applicant">Co-applicant</option>
                            </select>
                          </Form.Item>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Cheque Button */}
            <Button onClick={addCheque} variant="outline" className="w-full">
              + Add Another Cheque
            </Button>
          </div>
        )}
        {/* ECS Section */}
        {instrumentType === "ECS" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              ECS Details
            </h3>

            <div className="bg-card rounded-lg border border-border p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Form.Item
                  label="MICR Code"
                  name="ecs_micrCode"
                  className="mb-0"
                >
                  <input
                    type="text"
                    className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                    placeholder="e.g., 400240002"
                  />
                </Form.Item>

                <Form.Item
                  label="Bank Name"
                  name="ecs_bankName"
                  className="mb-0"
                >
                  <input
                    type="text"
                    className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                    placeholder="e.g., HDFC Bank"
                  />
                </Form.Item>

                <Form.Item
                  label="Account Number"
                  name="ecs_accountNumber"
                  className="mb-0"
                >
                  <input
                    type="text"
                    className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                    placeholder="e.g., 1234567890"
                  />
                </Form.Item>

                <Form.Item label="Date" name="ecs_date" className="mb-0">
                  <input
                    type="date"
                    className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                  />
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Form.Item label="Amount" name="ecs_amount" className="mb-0">
                  <input
                    type="number"
                    className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                    placeholder="e.g., 50000"
                  />
                </Form.Item>

                <Form.Item label="Tag" name="ecs_tag" className="mb-0">
                  <input
                    type="text"
                    className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                    placeholder="e.g., EMI"
                  />
                </Form.Item>

                <Form.Item
                  label="Favouring"
                  name="ecs_favouring"
                  className="mb-0"
                >
                  <input
                    type="text"
                    className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                    placeholder="e.g., ABC Finance"
                  />
                </Form.Item>

                <Form.Item
                  label="Signed By"
                  name="ecs_signedBy"
                  className="mb-0"
                >
                  <select className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background">
                    <option value="">Select</option>
                    <option value="Applicant">Applicant</option>
                    <option value="Co-applicant">Co-applicant</option>
                  </select>
                </Form.Item>
              </div>
            </div>
          </div>
        )}
        {/* SI Section */}
        {instrumentType === "SI" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              SI (Standing Instruction) Details
            </h3>

            <div className="bg-card rounded-lg border border-border p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item
                  label="Account Number"
                  name="si_accountNumber"
                  className="mb-0"
                >
                  <input
                    type="text"
                    className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
                    placeholder="e.g., 1234567890"
                  />
                </Form.Item>

                <Form.Item
                  label="Signed By"
                  name="si_signedBy"
                  className="mb-0"
                >
                  <select className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background">
                    <option value="">Select</option>
                    <option value="Applicant">Applicant</option>
                    <option value="Co-applicant">Co-applicant</option>
                  </select>
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
