import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getSettings, UserSettings } from "@/lib/settings";

/**
 * 認証状態とAI設定を取得するフック。
 * settings が必要なページ（talk/page, settings/page, talk/[id]/page など）で使う。
 * settings が不要なページは useRequireAuth を使う。
 *
 * - loading: auth確認 + settings取得が両方完了するまで true
 * - 未ログインなら /login へリダイレクト
 */
export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        // 未ログイン → リダイレクトしてロード完了
        router.replace("/login");
        setLoading(false);
      } else {
        setUser(currentUser);
        // settings取得が完了してからloading=falseにする
        // （settingsがnullのままページが描画されるのを防ぐ）
        getSettings(currentUser.uid).then((s) => {
          setSettings(s);
          setLoading(false);
        });
      }
    });
    // コンポーネントが破棄されたら認証状態の監視を停止する
    return () => unsubscribe();
  }, [router]);

  return { user, settings, loading };
}
