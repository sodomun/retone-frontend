"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import ProfileAvatar from "@/components/user/ProfileAvatar";
import Footer from "@/components/common/Footer";
import LogoutModal from "@/components/common/LogoutModal";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        setLoading(false);
        return;
      }
      setUser(currentUser);
      const snap = await getDoc(doc(db, "users", currentUser.uid));
      if (snap.exists()) {
        setDisplayName(snap.data().displayName ?? "");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    // signOut後にonAuthStateChangedがcurrentUser=nullで発火し、/loginへリダイレクト
  };

  if (loading) return <p>読み込み中...</p>;
  if (!user) return null;

  return (
    <>
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
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--header-bg)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 20 }}>設定</h1>
        </header>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* プロフィールカード */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "20px 16px",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <ProfileAvatar displayName={displayName || user.email || "?"} size={56} />
            <div>
              <p style={{ margin: 0, fontWeight: "bold", fontSize: 16 }}>{displayName}</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--subtext-color)" }}>{user.email}</p>
            </div>
          </div>

          {/* 設定メニュー */}
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            <li>
              <button
                onClick={() => router.push("/settings/profile")}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--border-color)",
                  cursor: "pointer",
                  fontSize: 15,
                  color: "var(--foreground)",
                  textAlign: "left",
                }}
              >
                <span>プロフィール</span>
                <span style={{ color: "var(--subtext-color)" }}>›</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setShowLogoutModal(true)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  padding: "16px",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--border-color)",
                  cursor: "pointer",
                  fontSize: 15,
                  color: "#e53e3e",
                  textAlign: "left",
                }}
              >
                ログアウト
              </button>
            </li>
          </ul>
        </div>

        <Footer />
      </div>

      {showLogoutModal && (
        <LogoutModal
          onCancel={() => setShowLogoutModal(false)}
          onConfirm={handleLogout}
        />
      )}
    </>
  );
}
