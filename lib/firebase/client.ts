import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { getFirebaseConfig, hasFirebaseEnv } from "@/lib/firebase/config";

export function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    return initializeApp(getFirebaseConfig());
  }

  return getApp();
}

export function getFirebaseAppOrNull(): FirebaseApp | null {
  if (!hasFirebaseEnv()) {
    return null;
  }

  return getFirebaseApp();
}
