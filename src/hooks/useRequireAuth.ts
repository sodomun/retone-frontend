import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

/**
 * 認証チェックのみ行うフック。
 * useAuth との違いは settings を取得しない点。
 * settings が不要なページ（profile, add-member, new-group など）で使う。
 *
 * - loading: auth確認が完了するまで true
 * - 未ログインなら /login へリダイレクト
 */
export function useRequireAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) router.replace("/login");
      else setUser(currentUser);
      // ログイン・未ログインどちらの場合もロード完了
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  return { user, loading };
}
