import type { User } from "firebase/auth";
import {
  collection,
  deleteDoc,
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
import type { CritiqueItem, CritiqueResult, CritiqueSuggestion } from "@/lib/critique/types";
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
  summary: string;
  constraints: string;
  assumptions: string[];
  critiqueSeed: string[];
  critique: CritiqueResult | null;
  createdAt: string | null;
  updatedAt: string | null;
};

function getDbOrNull() {
  const app = getFirebaseAppOrNull();
  if (!app) return null;
  return getFirestore(app);
}

function toIsoStringOrNull(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : "";
}

function sanitizeProjectTitle(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Untitled design";
  return trimmed.slice(0, 100);
}

function isValidNodeType(value: unknown): value is AdesNode["type"] {
  return value === "goal" || value === "task" || value === "reflection" || value === "feedback" || value === "risk" || value === "eval" || value === "business_metric" || value === "handoff" || value === "assumption";
}

function parseNodeData(value: unknown): AdesNodeData | null {
  if (!value || typeof value !== "object") return null;

  const data = value as Record<string, unknown>;
  if (typeof data.label !== "string") return null;

  return {
    label: data.label,
    shortLabel: stringOrEmpty(data.shortLabel) || data.label,
    body: stringOrEmpty(data.body),
    tags: isStringArray(data.tags) ? data.tags : [],
    owner: typeof data.owner === "string" ? data.owner : "AI system",
    stepType:
      data.stepType === "task" ||
      data.stepType === "tool_use" ||
      data.stepType === "reflection" ||
      data.stepType === "human_feedback" ||
      data.stepType === "eval_checkpoint" ||
      data.stepType === "decision" ||
      data.stepType === "output"
        ? data.stepType
        : "task",
    purpose: stringOrEmpty(data.purpose),
    whyThisStepExists: stringOrEmpty(data.whyThisStepExists),
    inputs: stringOrEmpty(data.inputs),
    outputs: stringOrEmpty(data.outputs),
    tools: isStringArray(data.tools) ? data.tools : [],
    reasoningRequired: stringOrEmpty(data.reasoningRequired),
    completionCriteria: stringOrEmpty(data.completionCriteria),
    commonFailureModes: isStringArray(data.commonFailureModes) ? data.commonFailureModes : [],
    assumptions: isStringArray(data.assumptions) ? data.assumptions : [],
    risks: isStringArray(data.risks) ? data.risks : [],
    dependencies: isStringArray(data.dependencies) ? data.dependencies : [],
    reflectionHooks: Array.isArray(data.reflectionHooks) ? (data.reflectionHooks as AdesNodeData["reflectionHooks"]) : [],
    feedbackHooks: Array.isArray(data.feedbackHooks) ? (data.feedbackHooks as AdesNodeData["feedbackHooks"]) : [],
    evals: Array.isArray(data.evals) ? (data.evals as AdesNodeData["evals"]) : [],
    reflectionPrompt: stringOrEmpty(data.reflectionPrompt),
    reflectionTrigger: stringOrEmpty(data.reflectionTrigger),
    feedbackSource: stringOrEmpty(data.feedbackSource),
    feedbackCondition: stringOrEmpty(data.feedbackCondition),
    feedbackAction: stringOrEmpty(data.feedbackAction),
    feedbackUpdatesScope: data.feedbackUpdatesScope === "both" || data.feedbackUpdatesScope === "prompt" ? data.feedbackUpdatesScope : "current_run",
    evalName: stringOrEmpty(data.evalName),
    evalQuestion: stringOrEmpty(data.evalQuestion),
    evalMetric: stringOrEmpty(data.evalMetric),
    evalCategory:
      data.evalCategory === "task_success" ||
      data.evalCategory === "reasoning_quality" ||
      data.evalCategory === "tool_accuracy" ||
      data.evalCategory === "output_quality" ||
      data.evalCategory === "efficiency" ||
      data.evalCategory === "safety" ||
      data.evalCategory === "escalation" ||
      data.evalCategory === "reflection_effectiveness" ||
      data.evalCategory === "feedback_usefulness" ||
      data.evalCategory === "robustness"
        ? data.evalCategory
        : "task_success",
    evalScope: data.evalScope === "flow" ? "flow" : "step",
    evalCriteria: stringOrEmpty(data.evalCriteria),
    evalDataset: stringOrEmpty(data.evalDataset),
    evalMethod: stringOrEmpty(data.evalMethod),
    evalThreshold: stringOrEmpty(data.evalThreshold),
    businessMetric: stringOrEmpty(data.businessMetric),
    confidenceCheck: stringOrEmpty(data.confidenceCheck),
  };
}

function parseBoardSnapshot(value: unknown): AdesBoardSnapshot | null {
  if (!value || typeof value !== "object") return null;

  const board = value as Record<string, unknown>;
  if (!Array.isArray(board.nodes) || !Array.isArray(board.edges)) return null;

  const nodes: AdesNode[] = board.nodes
    .map((candidate) => {
      if (!candidate || typeof candidate !== "object") return null;
      const raw = candidate as Record<string, unknown>;
      const data = parseNodeData(raw.data);
      const position = raw.position as Record<string, unknown> | undefined;

      if (!data || typeof raw.id !== "string" || !isValidNodeType(raw.type)) return null;
      if (!position || typeof position.x !== "number" || typeof position.y !== "number") return null;

      return { id: raw.id, type: raw.type, position: { x: position.x, y: position.y }, data } as AdesNode;
    })
    .filter((node): node is AdesNode => Boolean(node));

  const edges = board.edges
    .map((candidate) => {
      if (!candidate || typeof candidate !== "object") return null;
      const raw = candidate as Record<string, unknown>;
      if (typeof raw.id !== "string" || typeof raw.source !== "string" || typeof raw.target !== "string") return null;

      const edge: AdesEdge = { id: raw.id, source: raw.source, target: raw.target };
      if (typeof raw.animated === "boolean") edge.animated = raw.animated;
      if (typeof raw.label === "string") edge.label = raw.label;
      if (raw.data && typeof raw.data === "object") edge.data = raw.data as AdesEdge["data"];
      return edge;
    })
    .filter((edge): edge is AdesEdge => edge !== null);

  if (!nodes.length) return null;
  return { nodes, edges };
}

function isCritiqueItem(value: unknown): value is CritiqueItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && (item.severity === "low" || item.severity === "medium" || item.severity === "high") && typeof item.message === "string" && typeof item.recommendation === "string";
}

function isCritiqueSuggestion(value: unknown): value is CritiqueSuggestion {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && (item.type === "reflection" || item.type === "eval" || item.type === "business_metric") && typeof item.title === "string" && typeof item.body === "string";
}

function parseCritique(value: unknown): CritiqueResult | null {
  if (!value || typeof value !== "object") return null;
  const critique = value as Record<string, unknown>;

  if (typeof critique.summary !== "string" || !Array.isArray(critique.critiqueItems) || !Array.isArray(critique.missingReflections) || !Array.isArray(critique.missingEvals) || !Array.isArray(critique.missingBusinessMetrics)) return null;

  return {
    summary: critique.summary,
    critiqueItems: critique.critiqueItems.filter(isCritiqueItem),
    missingReflections: critique.missingReflections.filter(isCritiqueSuggestion),
    missingEvals: critique.missingEvals.filter(isCritiqueSuggestion),
    missingBusinessMetrics: critique.missingBusinessMetrics.filter(isCritiqueSuggestion),
  };
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
    summary: stringOrEmpty(data.summary),
    constraints: stringOrEmpty(data.constraints),
    assumptions: isStringArray(data.assumptions) ? data.assumptions : [],
    critiqueSeed: isStringArray(data.critiqueSeed) ? data.critiqueSeed : [],
    critique: parseCritique(data.critique),
    createdAt: toIsoStringOrNull(data.createdAt),
    updatedAt: toIsoStringOrNull(data.updatedAt),
  };
}

export async function upsertUserDocument(user: User) {
  const db = getDbOrNull();
  if (!db) return;

  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    uid: user.uid,
    email: user.email ?? null,
    name: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    plan: "free",
    lastSeenAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });
}

export async function createProjectForUser(ownerUid: string, title: string) {
  const db = getDbOrNull();
  if (!db) throw new Error("Firestore is not configured.");

  const safeTitle = sanitizeProjectTitle(title);
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
    summary: "",
    constraints: "",
    assumptions: [],
    critiqueSeed: [],
    critique: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return projectRef.id;
}

export function subscribeToUserProjects(ownerUid: string, onProjects: (projects: ProjectRecord[]) => void, onError?: (error: Error) => void): Unsubscribe {
  const db = getDbOrNull();
  if (!db) {
    onProjects([]);
    return () => undefined;
  }

  const projectsQuery = query(collection(db, "projects"), where("ownerUid", "==", ownerUid), orderBy("updatedAt", "desc"));

  return onSnapshot(projectsQuery, (snapshot) => {
    const projects = snapshot.docs.map((docSnapshot) => mapProjectSnapshot(docSnapshot.data() as Record<string, unknown>));
    onProjects(projects);
  }, (error) => onError?.(error));
}

export async function renameProjectForUser(projectId: string, ownerUid: string, nextTitle: string) {
  const db = getDbOrNull();
  if (!db) throw new Error("Firestore is not configured.");
  if (!ownerUid) throw new Error("You must be signed in to rename a project.");

  const projectRef = doc(db, "projects", projectId);
  const projectSnapshot = await getDoc(projectRef);
  if (!projectSnapshot.exists()) throw new Error("Project not found.");

  const projectData = projectSnapshot.data() as Record<string, unknown>;
  if (projectData.ownerUid !== ownerUid) throw new Error("You do not have access to this project.");

  await updateDoc(projectRef, { title: sanitizeProjectTitle(nextTitle), updatedAt: serverTimestamp() });
}

export async function deleteProjectForUser(projectId: string, ownerUid: string) {
  const db = getDbOrNull();
  if (!db) throw new Error("Firestore is not configured.");

  const projectRef = doc(db, "projects", projectId);
  const snapshot = await getDoc(projectRef);
  if (!snapshot.exists()) throw new Error("Project not found.");

  const data = snapshot.data() as Record<string, unknown>;
  if (data.ownerUid !== ownerUid) throw new Error("You do not have access to this project.");

  await deleteDoc(projectRef);
}

export async function saveProjectBoardForUser(projectId: string, ownerUid: string, board: AdesBoardSnapshot) {
  const db = getDbOrNull();
  if (!db) throw new Error("Firestore is not configured.");

  const projectRef = doc(db, "projects", projectId);
  const snapshot = await getDoc(projectRef);
  if (!snapshot.exists()) throw new Error("Project not found.");

  const data = snapshot.data() as Record<string, unknown>;
  if (data.ownerUid !== ownerUid) throw new Error("You do not have access to this project.");

  await updateDoc(projectRef, { board, updatedAt: serverTimestamp() });
}

export async function getProjectForUser(projectId: string, ownerUid: string) {
  const db = getDbOrNull();
  if (!db) return null;

  const projectRef = doc(db, "projects", projectId);
  const snapshot = await getDoc(projectRef);
  if (!snapshot.exists()) return null;

  const data = snapshot.data() as Record<string, unknown>;
  if (data.ownerUid !== ownerUid) return null;

  return mapProjectSnapshot(data);
}
