"use client";

import { useRouter } from "next/navigation";

type Props = {
  displayName: string;
};

export default function ChatHeader({ displayName }: Props) {
  const router = useRouter();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderBottom: "1px solid var(--border-color)",
        position: "sticky",
        top: 0,
        background: "var(--header-bg)",
        zIndex: 10,
      }}
    >
      <button
        onClick={() => router.back()}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 20,
          lineHeight: 1,
          padding: 0,
        }}
        aria-label="戻る"
      >
        ←
      </button>
      <span style={{ fontWeight: "bold", fontSize: 16 }}>{displayName}</span>
    </div>
  );
}