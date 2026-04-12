import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type Auth,
  type NextOrObserver,
  type User,
  type UserCredential,
  type Unsubscribe
} from "firebase/auth";
import { hasFirebaseEnv } from "@/lib/firebase/config";
import { getFirebaseAppOrNull } from "@/lib/firebase/client";

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

let persistenceReadyPromise: Promise<void> | null = null;

function getClientAuth(): Auth | null {
  const app = getFirebaseAppOrNull();

  if (!app) {
    return null;
  }

  return getAuth(app);
}

function ensureLocalAuthPersistence(auth: Auth): Promise<void> {
  if (!persistenceReadyPromise) {
    persistenceReadyPromise = setPersistence(auth, browserLocalPersistence);
  }

  return persistenceReadyPromise;
}

function emitUnauthenticated(nextOrObserver: NextOrObserver<User>) {
  if (typeof nextOrObserver === "function") {
    nextOrObserver(null);
    return;
  }

  nextOrObserver.next?.(null);
}

export function subscribeToAuthState(nextOrObserver: NextOrObserver<User>): Unsubscribe {
  const auth = getClientAuth();

  if (!auth) {
    emitUnauthenticated(nextOrObserver);
    return () => undefined;
  }

  void ensureLocalAuthPersistence(auth);

  return onAuthStateChanged(auth, nextOrObserver);
}

export async function signInWithGoogle(): Promise<UserCredential> {
  const auth = getClientAuth();

  if (!auth || !hasFirebaseEnv()) {
    throw new Error("Firebase auth is not configured.");
  }

  await ensureLocalAuthPersistence(auth);
  return signInWithPopup(auth, provider);
}

export async function signOutUser() {
  const auth = getClientAuth();

  if (!auth) {
    return;
  }

  await signOut(auth);
}

export async function getCurrentUserIdToken(forceRefresh = false): Promise<string> {
  const auth = getClientAuth();
  const user = auth?.currentUser;

  if (!user) {
    throw new Error("You must be signed in to run generation.");
  }

  return user.getIdToken(forceRefresh);
}
