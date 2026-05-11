import React from "react";
import AciV2MessageBubble from "./AciV2MessageBubble";
import AciV2InlineRenderer from "./AciV2InlineRenderer";
import AciV2SuggestionPills from "./AciV2SuggestionPills";

export default function AciV2ChatThread({ messages = [], onAction }) {
  const list = Array.isArray(messages) ? messages : [];

  return (
    <section className="aci-v2-chat-thread">
      {list.map((message, index) => {
        const key = message.id || `${message.role || "assistant"}-${index}`;
        return (
          <AciV2MessageBubble
            key={key}
            role={message.role || "assistant"}
            text={message.text || message.answer || ""}
            inline={
              <AciV2InlineRenderer
                inlineType={message.inlineType}
                payload={message.inlinePayload || message.payload || {}}
              />
            }
          >
            <AciV2SuggestionPills
              items={message.leadingQuestions || message.actions || []}
              onAction={onAction}
            />
          </AciV2MessageBubble>
        );
      })}
    </section>
  );
}
