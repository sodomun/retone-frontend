"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import ProfileAvatar from "@/components/user/ProfileAvatar";
import Footer from "@/components/common/Footer";
import LogoutModal from "@/components/common/LogoutModal";
import { getSettings, updateSettings, DEFAULT_SYSTEM_PROMPT } from "@/lib/settings";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [aiEnabled, setAiEnabled] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);

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

      const settings = await getSettings(currentUser.uid);
      if (settings) {
        setAiEnabled(settings.aiEnabled);
        setSystemPrompt(settings.systemPrompt);
      }

      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    // signOut後にonAuthStateChangedがcurrentUser=nullで発火し、/loginへリダイレクト
  };

  const handleSaveAiSettings = async () => {
    if (!user) return;
    setAiSaving(true);
    await updateSettings(user.uid, { aiEnabled, systemPrompt });
    setAiSaving(false);
    setAiSaved(true);
    setTimeout(() => setAiSaved(false), 2000);
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
          </ul>

          {/* AI 設定セクション */}
          <div
            style={{
              padding: "20px 16px",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <h2 style={{ margin: "0 0 16px 0", fontSize: 15, fontWeight: "bold" }}>
              AI テキスト調整
            </h2>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 15 }}>受信メッセージをAIで調整する</span>
              <button
                onClick={() => setAiEnabled((prev) => !prev)}
                aria-label="AI調整の有効/無効"
                style={{
                  width: 48,
                  height: 28,
                  borderRadius: 14,
                  border: "none",
                  cursor: "pointer",
                  background: aiEnabled ? "#0084ff" : "var(--border-color)",
                  position: "relative",
                  flexShrink: 0,
                  transition: "background 0.2s",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: aiEnabled ? 23 : 3,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                    transition: "left 0.2s",
                  }}
                />
              </button>
            </div>

            {aiEnabled && (
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: "var(--subtext-color)",
                    marginBottom: 8,
                  }}
                >
                  調整スタイル
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={5}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: 14,
                    border: "1px solid var(--border-color)",
                    borderRadius: 8,
                    background: "var(--background)",
                    color: "var(--foreground)",
                    resize: "vertical",
                    boxSizing: "border-box",
                    lineHeight: 1.6,
                  }}
                />
              </div>
            )}

            <button
              onClick={handleSaveAiSettings}
              disabled={aiSaving}
              style={{
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: "bold",
                background: aiSaved ? "#38a169" : "#0084ff",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: aiSaving ? "not-allowed" : "pointer",
                opacity: aiSaving ? 0.7 : 1,
                transition: "background 0.3s",
              }}
            >
              {aiSaved ? "保存しました" : aiSaving ? "保存中..." : "保存する"}
            </button>
          </div>

          {/* ログアウト */}
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
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
