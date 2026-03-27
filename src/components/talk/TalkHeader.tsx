import Link from "next/link";

export default function TalkHeader() {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 16px",
        borderBottom: "1px solid var(--border-color)",
        background: "var(--header-bg)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <h1 style={{ margin: 0, fontSize: 20 }}>トーク</h1>
      <div style={{ display: "flex", gap: 8 }}>
        <Link href="/talk/new-group">
          <button
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              background: "none",
              color: "#0084ff",
              border: "1px solid #0084ff",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            グループ作成
          </button>
        </Link>
        <Link href="/friends/add">
          <button
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              background: "#0084ff",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            + 友達追加
          </button>
        </Link>
      </div>
    </header>
  );
}
