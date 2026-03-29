import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

/**
 * 未ログイン専用ページ（/login, /signup）で使うフック。
 * ログイン済みの場合は /talk へリダイレクトする。
 *
 * - loading: auth確認が完了するまで true
 */
export function useGuestOnly() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        router.replace("/talk");
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  return { loading };
}
