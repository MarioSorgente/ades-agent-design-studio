const firebaseEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
} as const;

const requiredFirebaseEnvKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID"
] as const;

export function getMissingFirebaseEnvKeys() {
  return requiredFirebaseEnvKeys.filter((key) => {
    const value = firebaseEnv[key];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

export function hasFirebaseEnv() {
  return getMissingFirebaseEnvKeys().length === 0;
}

export function getFirebaseConfig() {
  if (!hasFirebaseEnv()) {
    throw new Error(
      `Missing Firebase web configuration: ${getMissingFirebaseEnvKeys().join(", ")}. Add NEXT_PUBLIC_FIREBASE_* environment variables before using auth.`
    );
  }

  return {
    apiKey: firebaseEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: firebaseEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: firebaseEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: firebaseEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: firebaseEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: firebaseEnv.NEXT_PUBLIC_FIREBASE_APP_ID
  };
}
