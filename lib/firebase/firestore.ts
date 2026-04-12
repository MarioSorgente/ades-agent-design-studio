import type { User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe
} from "firebase/firestore";
import { getFirebaseAppOrNull } from "@/lib/firebase/client";

export type ProjectRecord = {
  id: string;
  ownerUid: string;
  title: string;
  description: string;
  ideaPrompt: string;
  audience: string;
  status: "draft" | "generated";
  createdAt: string | null;
  updatedAt: string | null;
};

function getDbOrNull() {
  const app = getFirebaseAppOrNull();

  if (!app) {
    return null;
  }

  return getFirestore(app);
}

function toIsoStringOrNull(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  return null;
}

function mapProjectSnapshot(data: Record<string, unknown>): ProjectRecord {
  return {
    id: String(data.id ?? ""),
    ownerUid: String(data.ownerUid ?? ""),
    title: String(data.title ?? "Untitled design"),
    description: String(data.description ?? ""),
    ideaPrompt: String(data.ideaPrompt ?? ""),
    audience: String(data.audience ?? ""),
    status: data.status === "generated" ? "generated" : "draft",
    createdAt: toIsoStringOrNull(data.createdAt),
    updatedAt: toIsoStringOrNull(data.updatedAt)
  };
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

export async function createProjectForUser(ownerUid: string, title: string) {
  const db = getDbOrNull();

  if (!db) {
    throw new Error("Firestore is not configured.");
  }

  const safeTitle = title.trim() || "Untitled design";
  const projectRef = doc(collection(db, "projects"));

  await setDoc(projectRef, {
    id: projectRef.id,
    ownerUid,
    title: safeTitle,
    description: "",
    ideaPrompt: "",
    audience: "",
    status: "draft",
    board: null,
    summary: null,
    critique: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return projectRef.id;
}

export function subscribeToUserProjects(
  ownerUid: string,
  onProjects: (projects: ProjectRecord[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const db = getDbOrNull();

  if (!db) {
    onProjects([]);
    return () => undefined;
  }

  const projectsQuery = query(
    collection(db, "projects"),
    where("ownerUid", "==", ownerUid),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(
    projectsQuery,
    (snapshot) => {
      const projects = snapshot.docs.map((docSnapshot) =>
        mapProjectSnapshot(docSnapshot.data() as Record<string, unknown>)
      );

      onProjects(projects);
    },
    (error) => {
      onError?.(error);
    }
  );
}

export async function renameProjectForUser(projectId: string, ownerUid: string, nextTitle: string) {
  const db = getDbOrNull();

  if (!db) {
    throw new Error("Firestore is not configured.");
  }

  if (!ownerUid) {
    throw new Error("You must be signed in to rename a project.");
  }

  const projectRef = doc(db, "projects", projectId);

  await updateDoc(projectRef, {
    title: nextTitle.trim() || "Untitled design",
    updatedAt: serverTimestamp()
  });
}

export async function getProjectForUser(projectId: string, ownerUid: string) {
  const db = getDbOrNull();

  if (!db) {
    return null;
  }

  const projectRef = doc(db, "projects", projectId);
  const snapshot = await getDoc(projectRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as Record<string, unknown>;

  if (data.ownerUid !== ownerUid) {
    return null;
  }

  return mapProjectSnapshot(data);
}
