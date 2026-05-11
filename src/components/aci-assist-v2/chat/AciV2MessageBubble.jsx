import React from "react";

export default function AciV2MessageBubble({
  role = "assistant",
  text = "",
  inline = null,
  children = null,
}) {
  const isUser = role === "user";

  return (
    <article className={`aci-v2-message ${isUser ? "user" : "assistant"}`}>
      <div className="aci-v2-message-body">
        {text ? <p>{text}</p> : null}
        {inline}
        {children}
      </div>
    </article>
  );
}
