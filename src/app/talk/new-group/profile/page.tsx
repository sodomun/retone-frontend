"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getUserProfile } from "@/lib/users";
import { createGroupChat } from "@/lib/chat";
import ProfileAvatar from "@/components/user/ProfileAvatar";

type MemberInfo = {
  uid: string;
  displayName: string;
};

export default function GroupProfilePage() {
  return (
    <Suspense fallback={<p>読み込み中...</p>}>
      <GroupProfileContent />
    </Suspense>
  );
}

function GroupProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useRequireAuth();
  const [myDisplayName, setMyDisplayName] = useState("");
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [groupName, setGroupName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // 自分と選択メンバーのdisplayNameをFirestoreから取得する
  useEffect(() => {
    if (!user) return;
    const memberUids = (searchParams.get("members") ?? "").split(",").filter(Boolean);

    Promise.all([
      getUserProfile(user.uid),
      ...memberUids.map((uid) => getUserProfile(uid)),
    ]).then(([myProfile, ...memberProfiles]) => {
      setMyDisplayName(myProfile?.displayName ?? "");
      setMembers(
        memberProfiles.map((p, i) => ({
          uid: memberUids[i],
          displayName: p?.displayName ?? memberUids[i],
        }))
      );
      setProfileLoading(false);
    });
  }, [user, searchParams]);

  const handleCreate = async () => {
    if (!user || !groupName.trim()) return;
    setSubmitting(true);

    const allMembers = [user.uid, ...members.map((m) => m.uid)];
    const memberNames: Record<string, string> = { [user.uid]: myDisplayName };
    members.forEach((m) => { memberNames[m.uid] = m.displayName; });

    const chatId = await createGroupChat(allMembers, memberNames, groupName.trim());
    router.replace(`/talk/${chatId}`);
  };

  if (authLoading || profileLoading) return <p>読み込み中...</p>;
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
