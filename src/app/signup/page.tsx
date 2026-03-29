"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signupUser } from "@/lib/auth";
import { useGuestOnly } from "@/hooks/useGuestOnly";

export default function SignupPage() {
  const router = useRouter();
  const { loading } = useGuestOnly();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signupUser(email, password, displayName);
      router.push("/talk");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "サインアップに失敗しました");
      setSubmitting(false);
    }
  };

  const inputStyle = (field: string): React.CSSProperties => ({
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: `1.5px solid ${focusedField === field ? "#0084ff" : "var(--input-border)"}`,
    boxShadow: focusedField === field ? "0 0 0 3px rgba(0, 132, 255, 0.15)" : "none",
    background: "var(--input-bg)",
    color: "var(--foreground)",
    fontSize: 15,
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    boxSizing: "border-box",
  });

  if (loading) return null;

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "var(--background)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--header-bg)",
          borderRadius: 20,
          padding: "40px 32px",
          boxShadow: "var(--card-shadow)",
        }}
      >
        {/* アプリ名 */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#0084ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              margin: "0 auto 12px",
            }}
          >
            💬
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: "bold", letterSpacing: 1 }}>ReTone</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--subtext-color)" }}>
            アカウントを作成しましょう
          </p>
        </div>

        <form onSubmit={handleSignup}>
          {/* 表示名 */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: "bold",
                marginBottom: 6,
                color: "var(--subtext-color)",
              }}
            >
              表示名
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onFocus={() => setFocusedField("displayName")}
              onBlur={() => setFocusedField(null)}
              placeholder="あなたの名前"
              required
              style={inputStyle("displayName")}
            />
          </div>

          {/* メールアドレス */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: "bold",
                marginBottom: 6,
                color: "var(--subtext-color)",
              }}
            >
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              placeholder="example@mail.com"
              required
              style={inputStyle("email")}
            />
          </div>

          {/* パスワード */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: "bold",
                marginBottom: 6,
                color: "var(--subtext-color)",
              }}
            >
              パスワード
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                placeholder="••••••••"
                required
                style={{ ...inputStyle("password"), paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 18,
                  color: "var(--subtext-color)",
                  padding: 0,
                  lineHeight: 1,
                }}
                aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {/* エラー */}
          {error && (
            <div
              style={{
                background: "rgba(229, 62, 62, 0.1)",
                border: "1px solid rgba(229, 62, 62, 0.3)",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 16,
                fontSize: 13,
                color: "#e53e3e",
              }}
            >
              {error}
            </div>
          )}

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 10,
              background: submitting ? "#ccc" : "#0084ff",
              color: "#fff",
              border: "none",
              cursor: submitting ? "default" : "pointer",
              fontSize: 15,
              fontWeight: "bold",
            }}
          >
            {submitting ? "登録中..." : "アカウントを作成"}
          </button>
        </form>

        {/* ログインへのリンク */}
        <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--subtext-color)" }}>
          アカウントをお持ちの方は{" "}
          <Link href="/login" style={{ color: "#0084ff", fontWeight: "bold" }}>
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
