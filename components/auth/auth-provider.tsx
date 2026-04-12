"use client";

import { useEffect } from "react";
import { subscribeToAuthState } from "@/lib/firebase/auth";
import { hasFirebaseEnv } from "@/lib/firebase/config";
import { upsertUserDocument } from "@/lib/firebase/firestore";
import { useAuthStore } from "@/lib/auth/store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((state) => state.setUser);
  const setConfigured = useAuthStore((state) => state.setConfigured);

  useEffect(() => {
    if (!hasFirebaseEnv()) {
      setConfigured(false);
      return;
    }

    setConfigured(true);

    const unsubscribe = subscribeToAuthState(async (user) => {
      setUser(user);

      if (user) {
        await upsertUserDocument(user);
      }
    });

    return () => unsubscribe();
  }, [setConfigured, setUser]);

  return <>{children}</>;
}
