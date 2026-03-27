"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/talk");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
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
            ログインしてはじめましょう
          </p>
        </div>

        <form onSubmit={handleLogin}>
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
            {submitting ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        {/* サインアップへのリンク */}
        <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--subtext-color)" }}>
          アカウントをお持ちでない方は{" "}
          <Link href="/signup" style={{ color: "#0084ff", fontWeight: "bold" }}>
            新規登録
          </Link>
        </p>
      </div>
    </div>
  );
}
