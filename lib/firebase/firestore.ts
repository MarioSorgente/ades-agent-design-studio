import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { getFirebaseAppOrNull } from "@/lib/firebase/client";

function getDbOrNull() {
  const app = getFirebaseAppOrNull();

  if (!app) {
    return null;
  }

  return getFirestore(app);
}

export async function upsertUserDocument(user: User) {
  const db = getDbOrNull();

  if (!db) {
    return;
  }

  const userRef = doc(db, "users", user.uid);

  await setDoc(
    userRef,
    {
      uid: user.uid,
      email: user.email ?? null,
      name: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      plan: "free",
      lastSeenAt: serverTimestamp(),
      createdAt: serverTimestamp()
    },
    { merge: true }
  );
}
