"use client";

import { useRouter } from "next/navigation";
import ProfileAvatar from "@/components/user/ProfileAvatar";

type Props = {
  displayName: string;
  chatId: string;
};

export default function ChatHeader({ displayName, chatId }: Props) {
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
          color: "var(--foreground)",
        }}
        aria-label="戻る"
      >
        ←
      </button>
      <div
        onClick={() => router.push(`/talk/${chatId}/profile`)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
        }}
      >
        <ProfileAvatar displayName={displayName} size={36} />
        <span style={{ fontWeight: "bold", fontSize: 16 }}>{displayName}</span>
      </div>
    </div>
  );
}
