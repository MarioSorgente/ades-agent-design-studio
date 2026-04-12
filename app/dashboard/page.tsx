"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/app-shell";
import {
  createProjectForUser,
  renameProjectForUser,
  subscribeToUserProjects,
  type ProjectRecord
} from "@/lib/firebase/firestore";
import { useAuthStore } from "@/lib/auth/store";

function formatDateTimeLabel(isoString: string | null) {
  if (!isoString) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(isoString));
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setIsLoadingProjects(status === "loading");
      return;
    }

    const unsubscribe = subscribeToUserProjects(
      user.uid,
      (nextProjects) => {
        setProjects(nextProjects);
        setIsLoadingProjects(false);
      },
      (error) => {
        setErrorMessage(error.message);
        setIsLoadingProjects(false);
      }
    );

    return () => unsubscribe();
  }, [status, user]);

  const projectsLabel = useMemo(() => {
    if (!projects.length) {
      return "No projects yet";
    }

    return `${projects.length} project${projects.length === 1 ? "" : "s"}`;
  }, [projects.length]);

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || isCreating) {
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const projectId = await createProjectForUser(user.uid, newTitle);
      setNewTitle("");
      router.push(`/project/${projectId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create project.";
      setErrorMessage(message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRename(project: ProjectRecord) {
    if (!user) {
      return;
    }

    const proposedTitle = window.prompt("Rename project", project.title)?.trim();

    if (!proposedTitle || proposedTitle === project.title) {
      return;
    }

    setErrorMessage(null);

    try {
      await renameProjectForUser(project.id, user.uid, proposedTitle);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not rename project.";
      setErrorMessage(message);
    }
  }

  return (
    <AppShell
      title="Dashboard"
      subtitle="Your agent design workspace. Start a new design or continue an existing draft."
    >
      <ProtectedRoute>
        <section className="space-y-4">
          <form
            onSubmit={handleCreateProject}
            className="rounded-2xl border border-ades-soft bg-white p-4 md:p-5"
          >
            <h2 className="text-base font-semibold">Create a new design</h2>
            <p className="mt-1 text-sm text-slate-600">
              Give the design a short title now. You can refine it in the studio.
            </p>
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                type="text"
                placeholder="e.g., Refund Support Agent"
                className="w-full rounded-lg border border-ades-soft px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                maxLength={100}
              />
              <button
                type="submit"
                disabled={isCreating || !user}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "New design"}
              </button>
            </div>
          </form>

          {errorMessage ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{errorMessage}</div>
          ) : null}

          <article className="rounded-2xl border border-ades-soft bg-white p-4 md:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Recent projects</h2>
              <span className="text-xs uppercase tracking-wide text-slate-500">{projectsLabel}</span>
            </div>

            {isLoadingProjects ? (
              <p className="mt-4 text-sm text-slate-600">Loading your projects...</p>
            ) : null}

            {!isLoadingProjects && !projects.length ? (
              <div className="mt-4 rounded-xl border border-dashed border-ades-soft bg-slate-50 p-6 text-center">
                <h3 className="text-sm font-semibold">No projects yet</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Create your first design to begin mapping tasks, reflections, critique, and evals.
                </p>
              </div>
            ) : null}

            {!isLoadingProjects && projects.length ? (
              <ul className="mt-4 space-y-3">
                {projects.map((project) => (
                  <li key={project.id} className="rounded-xl border border-ades-soft p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">{project.title}</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Updated {formatDateTimeLabel(project.updatedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleRename(project)}
                          className="rounded-lg border border-ades-soft px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Rename
                        </button>
                        <Link
                          href={`/project/${project.id}`}
                          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                        >
                          Open studio
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        </section>
      </ProtectedRoute>
    </AppShell>
  );
}
