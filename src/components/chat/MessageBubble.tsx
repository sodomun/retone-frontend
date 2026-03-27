import ProfileAvatar from "@/components/user/ProfileAvatar";

type Props = {
  text: string;
  isMine: boolean;
  createdAt: Date | null;
  isRead?: boolean;
  displayName?: string;
};

export default function MessageBubble({ text, isMine, createdAt, isRead, displayName }: Props) {
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
        <ProfileAvatar displayName={displayName || "?"} size={32} />
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
        <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
          {isMine && isRead && (
            <span style={{ fontSize: 10, color: "var(--subtext-color)" }}>既読</span>
          )}
          {timeStr && (
            <span style={{ fontSize: 10, color: "var(--timestamp-color)" }}>{timeStr}</span>
          )}
        </div>
      </div>
    </div>
  );
}
