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
  type Unsubscribe,
} from "firebase/firestore";
import type { AdesBoardSnapshot, AdesEdge, AdesNode, AdesNodeData } from "@/lib/board/types";
import { getFirebaseAppOrNull } from "@/lib/firebase/client";

export type ProjectRecord = {
  id: string;
  ownerUid: string;
  title: string;
  description: string;
  ideaPrompt: string;
  audience: string;
  status: "draft" | "generated";
  board: AdesBoardSnapshot | null;
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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseNodeData(value: unknown): AdesNodeData | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const data = value as Record<string, unknown>;
  if (typeof data.label !== "string") {
    return null;
  }

  return {
    label: data.label,
    body: typeof data.body === "string" ? data.body : "",
    tags: isStringArray(data.tags) ? data.tags : [],
    reflectionPrompt: typeof data.reflectionPrompt === "string" ? data.reflectionPrompt : "",
    evalMetric: typeof data.evalMetric === "string" ? data.evalMetric : "",
    businessMetric: typeof data.businessMetric === "string" ? data.businessMetric : "",
  };
}

function parseBoardSnapshot(value: unknown): AdesBoardSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const board = value as Record<string, unknown>;
  if (!Array.isArray(board.nodes) || !Array.isArray(board.edges)) {
    return null;
  }

  const nodes: AdesNode[] = board.nodes
    .map((candidate) => {
      if (!candidate || typeof candidate !== "object") {
        return null;
      }

      const raw = candidate as Record<string, unknown>;
      const data = parseNodeData(raw.data);
      const position = raw.position as Record<string, unknown> | undefined;

      if (!data || typeof raw.id !== "string" || typeof raw.type !== "string") {
        return null;
      }

      if (!position || typeof position.x !== "number" || typeof position.y !== "number") {
        return null;
      }

      return {
        id: raw.id,
        type: raw.type,
        position: { x: position.x, y: position.y },
        data,
      } as AdesNode;
    })
    .filter((node): node is AdesNode => Boolean(node));

  const edges = board.edges
    .map((candidate) => {
      if (!candidate || typeof candidate !== "object") {
        return null;
      }

      const raw = candidate as Record<string, unknown>;
      if (typeof raw.id !== "string" || typeof raw.source !== "string" || typeof raw.target !== "string") {
        return null;
      }

      const edge: AdesEdge = {
        id: raw.id,
        source: raw.source,
        target: raw.target,
      };

      if (typeof raw.animated === "boolean") {
        edge.animated = raw.animated;
      }

      return edge;
    })
    .filter((edge): edge is AdesEdge => edge !== null);

  if (!nodes.length) {
    return null;
  }

  return { nodes, edges };
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
    board: parseBoardSnapshot(data.board),
    createdAt: toIsoStringOrNull(data.createdAt),
    updatedAt: toIsoStringOrNull(data.updatedAt),
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
      createdAt: serverTimestamp(),
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
    updatedAt: serverTimestamp(),
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

  const projectsQuery = query(collection(db, "projects"), where("ownerUid", "==", ownerUid), orderBy("updatedAt", "desc"));

  return onSnapshot(
    projectsQuery,
    (snapshot) => {
      const projects = snapshot.docs.map((docSnapshot) => mapProjectSnapshot(docSnapshot.data() as Record<string, unknown>));

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
    updatedAt: serverTimestamp(),
  });
}

export async function saveProjectBoardForUser(projectId: string, ownerUid: string, board: AdesBoardSnapshot) {
  const db = getDbOrNull();

  if (!db) {
    throw new Error("Firestore is not configured.");
  }

  const projectRef = doc(db, "projects", projectId);
  const snapshot = await getDoc(projectRef);

  if (!snapshot.exists()) {
    throw new Error("Project not found.");
  }

  const data = snapshot.data() as Record<string, unknown>;
  if (data.ownerUid !== ownerUid) {
    throw new Error("You do not have access to this project.");
  }

  await updateDoc(projectRef, {
    board,
    updatedAt: serverTimestamp(),
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
