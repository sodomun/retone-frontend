"use client";

import { useState } from "react";

type Props = {
  onSend: (text: string) => void;
};

export default function MessageInput({ onSend }: Props) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "12px 16px",
        borderTop: "1px solid #eee",
        position: "sticky",
        bottom: 0,
        background: "#fff",
      }}
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="メッセージを入力..."
        style={{
          flex: 1,
          padding: "8px 12px",
          borderRadius: 20,
          border: "1px solid #ddd",
          fontSize: 14,
          outline: "none",
        }}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim()}
        style={{
          padding: "8px 16px",
          borderRadius: 20,
          background: text.trim() ? "#0084ff" : "#ccc",
          color: "#fff",
          border: "none",
          cursor: text.trim() ? "pointer" : "default",
          fontSize: 14,
        }}
      >
        送信
      </button>
    </div>
  );
}