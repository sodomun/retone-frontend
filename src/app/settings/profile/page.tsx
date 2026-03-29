"use client";

import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import ProfileAvatar from "@/components/user/ProfileAvatar";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useRequireAuth();
  const profile = useUserProfile(user?.uid);

  if (loading || !profile) return <p>読み込み中...</p>;
  if (!user) return null;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 640,
        margin: "0 auto",
        minHeight: "100dvh",
        background: "var(--background)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
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
            lineHeight: 1,
            padding: 0,
            color: "var(--foreground)",
          }}
          aria-label="戻る"
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: 20 }}>プロフィール</h1>
      </header>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "40px 16px",
          gap: 8,
        }}
      >
        <ProfileAvatar displayName={profile.displayName} size={80} />
        <p style={{ margin: "8px 0 0", fontWeight: "bold", fontSize: 22 }}>
          {profile.displayName}
        </p>
        <p style={{ margin: 0, fontSize: 14, color: "var(--subtext-color)" }}>
          {user.email}
        </p>
      </div>

      <div
        style={{
          margin: "0 16px",
          borderRadius: 12,
          border: "1px solid var(--border-color)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <span style={{ color: "var(--subtext-color)", fontSize: 14 }}>ユーザーID</span>
          <span style={{ fontSize: 14, fontFamily: "monospace" }}>{profile.uid}</span>
        </div>
        {profile.createdAt && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "14px 16px",
            }}
          >
            <span style={{ color: "var(--subtext-color)", fontSize: 14 }}>登録日</span>
            <span style={{ fontSize: 14 }}>
              {profile.createdAt.toLocaleDateString("ja-JP")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
