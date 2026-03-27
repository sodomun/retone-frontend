"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import ProfileAvatar from "@/components/user/ProfileAvatar";

type ProfileData = {
  uid: string;
  displayName: string;
  createdAt: Date | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        setLoading(false);
        return;
      }
      setUser(currentUser);
      // 認証から得たUIDのみ使用。URLパラメータは使わないため他ユーザーのデータを取得不可。
      // Firestore Security Rules側でも allow read: if request.auth.uid == userId で二重保護可能。
      const snap = await getDoc(doc(db, "users", currentUser.uid));
      if (snap.exists()) {
        const data = snap.data();
        setProfile({
          uid: data.uid,
          displayName: data.displayName ?? "",
          createdAt: data.createdAt?.toDate() ?? null,
        });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) return <p>読み込み中...</p>;
  if (!user || !profile) return null;

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
