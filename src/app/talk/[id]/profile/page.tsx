"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useChatData } from "@/hooks/useChatData";
import ProfileAvatar from "@/components/user/ProfileAvatar";
import { deleteFriend } from "@/lib/friends";
import { leaveGroup } from "@/lib/group";

export default function ChatProfilePage() {
  const { id: chatId } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useRequireAuth();
  const { chat, loading } = useChatData(chatId, user?.uid);
  const [submitting, setSubmitting] = useState(false);

  if (loading || !user || !chat) return <p>読み込み中...</p>;

  const isGroup = chat.type === "group";

  // ---- グループプロフィール ----
  if (isGroup) {
    const groupName = chat.name ?? "グループ";

    const handleLeave = async () => {
      if (!confirm(`「${groupName}」を退会しますか？`)) return;
      setSubmitting(true);
      await leaveGroup(chatId, user.uid);
      router.replace("/talk");
    };

    return (
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          height: "100dvh",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--header-bg)",
            position: "sticky",
            top: 0,
            zIndex: 10,
            gap: 12,
          }}
        >
          <button
            onClick={() => router.back()}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: "var(--foreground)",
              padding: 0,
              lineHeight: 1,
            }}
            aria-label="戻る"
          >
            ←
          </button>
          <span style={{ fontWeight: "bold", fontSize: 16 }}>グループ情報</span>
        </header>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "40px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "var(--avatar-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
            }}
          >
            👥
          </div>
          <p style={{ fontWeight: "bold", fontSize: 18, margin: 0 }}>{groupName}</p>
          <p style={{ fontSize: 13, color: "var(--subtext-color)", margin: 0 }}>
            {chat.members?.length ?? 0}人のメンバー
          </p>

          <button
            onClick={() => router.push(`/talk/${chatId}/add-member`)}
            style={{
              marginTop: 32,
              padding: "12px 32px",
              borderRadius: 10,
              border: "1.5px solid var(--border-color)",
              background: "var(--input-bg)",
              color: "var(--foreground)",
              fontWeight: "bold",
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            グループに友達追加
          </button>
          <button
            onClick={handleLeave}
            disabled={submitting}
            style={{
              marginTop: 12,
              padding: "12px 32px",
              borderRadius: 10,
              border: "none",
              background: "#ff3b30",
              color: "#fff",
              fontWeight: "bold",
              fontSize: 15,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "処理中..." : "退会する"}
          </button>
        </div>
      </div>
    );
  }

  // ---- ダイレクトチャット プロフィール ----
  const partnerUid = chat.members?.find((uid) => uid !== user.uid) ?? "";
  const partnerName = chat.memberNames?.[partnerUid] ?? "不明";

  const handleDeleteFriend = async () => {
    if (!confirm(`「${partnerName}」を友達から削除しますか？\nチャット履歴も削除されます。`)) return;
    setSubmitting(true);
    await deleteFriend(user.uid, partnerUid);
    router.replace("/talk");
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 640,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--header-bg)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          gap: 12,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 20,
            color: "var(--foreground)",
            padding: 0,
            lineHeight: 1,
          }}
          aria-label="戻る"
        >
          ←
        </button>
        <span style={{ fontWeight: "bold", fontSize: 16 }}>プロフィール</span>
      </header>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "40px 16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <ProfileAvatar displayName={partnerName} size={80} />
        <p style={{ fontWeight: "bold", fontSize: 18, margin: 0 }}>{partnerName}</p>

        <button
          onClick={handleDeleteFriend}
          disabled={submitting}
          style={{
            marginTop: 32,
            padding: "12px 32px",
            borderRadius: 10,
            border: "none",
            background: "#ff3b30",
            color: "#fff",
            fontWeight: "bold",
            fontSize: 15,
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? "処理中..." : "友達を削除する"}
        </button>
      </div>
    </div>
  );
}
