import React from "react";
import { Mic, SendHorizontal, Sparkles } from "lucide-react";
import { emitAciAction } from "../shared/AciAssistShared";

export default function AciV2Composer({
  onAction,
  placeholder = "Ask ACI Assist anything...",
  disabled = false,
}) {
  const [text, setText] = React.useState("");
  const submitLockRef = React.useRef(0);

  const handleSubmit = (event) => {
    event.preventDefault();
    const message = String(text || "").trim();
    if (!message || disabled) return;

    const now = Date.now();
    if (now - submitLockRef.current < 280) return;
    submitLockRef.current = now;

    emitAciAction(
      {
        id: `composer-${now}`,
        label: message,
        query: message,
        type: "ask",
      },
      onAction,
    );

    setText("");
  };

  return (
    <form className="aci-v2-composer" onSubmit={handleSubmit}>
      <button type="button" aria-label="ACI Assist">
        <Sparkles size={19} />
      </button>

      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />

      <button type="button" aria-label="Voice" disabled={disabled}>
        <Mic size={20} />
      </button>

      <button type="submit" aria-label="Send" disabled={disabled}>
        <SendHorizontal size={20} />
      </button>
    </form>
  );
}
