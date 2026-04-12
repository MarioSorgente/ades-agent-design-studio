import type { User } from "firebase/auth";
import { create } from "zustand";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthStore = {
  status: AuthStatus;
  user: User | null;
  isConfigured: boolean;
  setConfigured: (value: boolean) => void;
  setUser: (user: User | null) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  status: "loading",
  user: null,
  isConfigured: true,
  setConfigured: (value) => {
    set((state) => ({
      isConfigured: value,
      status: value ? state.status : "unauthenticated",
      user: value ? state.user : null
    }));
  },
  setUser: (user) =>
    set({
      user,
      status: user ? "authenticated" : "unauthenticated"
    })
}));
