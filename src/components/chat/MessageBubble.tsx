import ProfileAvatar from "@/components/user/ProfileAvatar";

type Props = {
  text: string;
  isMine: boolean;
  createdAt: Date | null;
  readCount?: number;
  isGroup?: boolean;
  displayName?: string;
  isAiAdjusted?: boolean;
};

export default function MessageBubble({ text, isMine, createdAt, readCount, isGroup, displayName, isAiAdjusted }: Props) {
  const timeStr = createdAt
    ? createdAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isMine ? "flex-end" : "flex-start",
        alignItems: "flex-end",
        gap: 8,
        marginBottom: 8,
      }}
    >
      {!isMine && (
        <>
          <span style={{ fontSize: 12, color: "var(--subtext-color)", flexShrink: 0 }}>
            {displayName}
          </span>
          <ProfileAvatar displayName={displayName || "?"} size={32} />
        </>
      )}
      <div
        style={{
          maxWidth: "70%",
          display: "flex",
          flexDirection: "column",
          alignItems: isMine ? "flex-end" : "flex-start",
        }}
      >
        <div
          style={{
            background: isMine ? "#0084ff" : "var(--bubble-partner-bg)",
            color: isMine ? "#fff" : "var(--bubble-partner-text)",
            padding: "8px 12px",
            borderRadius: 16,
            fontSize: 14,
            wordBreak: "break-word",
          }}
        >
          {text}
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 2, alignItems: "center" }}>
          {isMine && !!readCount && (
            <span style={{ fontSize: 10, color: "var(--subtext-color)" }}>
              既読{isGroup ? readCount : ""}
            </span>
          )}
          {timeStr && (
            <span style={{ fontSize: 10, color: "var(--timestamp-color)" }}>{timeStr}</span>
          )}
          {!isMine && isAiAdjusted && (
            <span style={{ fontSize: 10, color: "#0084ff" }}>✦</span>
          )}
        </div>
      </div>
    </div>
  );
}
