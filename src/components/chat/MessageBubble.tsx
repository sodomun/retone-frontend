type Props = {
  text: string;
  isMine: boolean;
  createdAt: Date | null;
};

export default function MessageBubble({ text, isMine, createdAt }: Props) {
  const timeStr = createdAt
    ? createdAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isMine ? "flex-end" : "flex-start",
        marginBottom: 8,
      }}
    >
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
            background: isMine ? "#0084ff" : "#f0f0f0",
            color: isMine ? "#fff" : "#000",
            padding: "8px 12px",
            borderRadius: 16,
            fontSize: 14,
            wordBreak: "break-word",
          }}
        >
          {text}
        </div>
        {timeStr && (
          <span style={{ fontSize: 10, color: "#999", marginTop: 2 }}>{timeStr}</span>
        )}
      </div>
    </div>
  );
}