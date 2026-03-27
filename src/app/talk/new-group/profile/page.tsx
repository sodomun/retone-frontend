"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { createGroupChat } from "@/lib/chat";
import ProfileAvatar from "@/components/user/ProfileAvatar";

type MemberInfo = {
  uid: string;
  displayName: string;
};

export default function GroupProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [myDisplayName, setMyDisplayName] = useState("");
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [groupName, setGroupName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        setLoading(false);
        return;
      }
      setUser(currentUser);

      // 自分の displayName を取得
      const mySnap = await getDoc(doc(db, "users", currentUser.uid));
      const myName = mySnap.exists() ? (mySnap.data().displayName ?? "") : "";
      setMyDisplayName(myName);

      // URLパラメータから選択済みメンバーのUIDを取得し displayName を取得
      const memberUids = (searchParams.get("members") ?? "").split(",").filter(Boolean);
      const memberInfos = await Promise.all(
        memberUids.map(async (uid) => {
          const snap = await getDoc(doc(db, "users", uid));
          const displayName = snap.exists() ? (snap.data().displayName ?? uid) : uid;
          return { uid, displayName };
        })
      );
      setMembers(memberInfos);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router, searchParams]);

  const handleCreate = async () => {
    if (!user || !groupName.trim()) return;
    setSubmitting(true);

    const allMembers = [user.uid, ...members.map((m) => m.uid)];
    const memberNames: Record<string, string> = { [user.uid]: myDisplayName };
    members.forEach((m) => { memberNames[m.uid] = m.displayName; });

    const chatId = await createGroupChat(allMembers, memberNames, groupName.trim());
    router.replace(`/talk/${chatId}`);
  };

  if (loading) return <p>読み込み中...</p>;
  if (!user) return null;

  // 表示するメンバー：自分 + 選択した友達
  const allMembers: MemberInfo[] = [
    { uid: user.uid, displayName: myDisplayName },
    ...members,
  ];

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
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--header-bg)",
          position: "sticky",
          top: 0,
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
            color: "var(--foreground)",
            padding: 0,
            lineHeight: 1,
          }}
          aria-label="戻る"
        >
          ←
        </button>
        <span style={{ fontWeight: "bold", fontSize: 16 }}>グループプロフィールの設定</span>
        <button
          onClick={handleCreate}
          disabled={!groupName.trim() || submitting}
          style={{
            background: "none",
            border: "none",
            cursor: groupName.trim() && !submitting ? "pointer" : "default",
            fontSize: 15,
            color: groupName.trim() && !submitting ? "#0084ff" : "var(--subtext-color)",
            fontWeight: "bold",
            padding: 0,
          }}
        >
          {submitting ? "作成中..." : "作成"}
        </button>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 16px" }}>
        {/* グループアイコン + グループ名入力 */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "var(--avatar-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              flexShrink: 0,
            }}
          >
            👥
          </div>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="グループ名を入力"
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1.5px solid var(--input-border)",
              background: "var(--input-bg)",
              color: "var(--foreground)",
              fontSize: 15,
              outline: "none",
            }}
          />
        </div>

        {/* メンバー一覧（1行4人程度の flex wrap） */}
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--subtext-color)" }}>
          メンバー（{allMembers.length}人）
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          {allMembers.map((m) => (
            <div
              key={m.uid}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                width: "calc(25% - 12px)",
              }}
            >
              <ProfileAvatar displayName={m.displayName} size={48} />
              <span
                style={{
                  fontSize: 11,
                  color: "var(--foreground)",
                  textAlign: "center",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  width: "100%",
                }}
              >
                {m.uid === user.uid ? `${m.displayName}（自分）` : m.displayName}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
