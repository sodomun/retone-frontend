import { useEffect, useState } from "react";
import { getUserProfile, UserProfile } from "@/lib/users";

/**
 * 指定UIDのFirestoreユーザープロフィールを取得するフック。
 * uid が確定（ログイン完了）してから1回だけ取得する。
 * リアルタイム購読ではなく、一度だけの取得（getDoc）。
 */
export function useUserProfile(uid: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // uid が確定するまで取得しない（認証前に実行されるのを防ぐ）
    if (!uid) return;
    getUserProfile(uid).then(setProfile);
  }, [uid]);

  return profile;
}
