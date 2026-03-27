type Props = {
  onCancel: () => void;
  onConfirm: () => void;
};

export default function LogoutModal({ onCancel, onConfirm }: Props) {
  return (
    <>
      {/* 背景オーバーレイ（クリックしても何もしない） */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 100,
        }}
      />
      {/* モーダル本体 */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "var(--header-bg)",
          borderRadius: 16,
          padding: "28px 24px 20px",
          width: "min(320px, 90vw)",
          zIndex: 101,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <p style={{ margin: 0, fontWeight: "bold", fontSize: 16 }}>ログアウト</p>
        <p style={{ margin: 0, fontSize: 14, color: "var(--subtext-color)", textAlign: "center" }}>
          ログアウトしますか？
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 12, width: "100%" }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 10,
              border: "1px solid var(--border-color)",
              background: "none",
              cursor: "pointer",
              fontSize: 15,
              color: "var(--foreground)",
            }}
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 10,
              border: "none",
              background: "#e53e3e",
              cursor: "pointer",
              fontSize: 15,
              color: "#fff",
              fontWeight: "bold",
            }}
          >
            ログアウト
          </button>
        </div>
      </div>
    </>
  );
}
