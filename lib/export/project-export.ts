import type { AdesBoardSnapshot, AdesNode } from "@/lib/board/types";
import type { ProjectRecord } from "@/lib/firebase/firestore";
import type { CritiqueResult } from "@/lib/critique/types";

type Section = {
  title: string;
  entries: AdesNode[];
};

function sortNodes(nodes: AdesNode[]) {
  return [...nodes].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
}

function createSections(board: AdesBoardSnapshot | null): Section[] {
  if (!board) {
    return [];
  }

  const byType = (type: AdesNode["type"]) => sortNodes(board.nodes.filter((node) => node.type === type));

  return [
    { title: "Goal", entries: byType("goal") },
    { title: "Tasks", entries: byType("task") },
    { title: "Reflections", entries: byType("reflection") },
    { title: "Feedback loops", entries: byType("feedback") },
    { title: "Risks", entries: byType("risk") },
    { title: "Evals", entries: byType("eval") },
    { title: "Business metrics", entries: byType("business_metric") },
    { title: "Assumptions", entries: byType("assumption") },
    { title: "Human handoff", entries: byType("handoff") },
  ];
}

function markdownListForNodes(nodes: AdesNode[]) {
  if (!nodes.length) {
    return "- _No entries yet._";
  }

  return nodes
    .map((node) => {
      const body = node.data.body.trim();
      const details = [
        node.data.reflectionPrompt?.trim(),
        node.data.evalMetric?.trim(),
        node.data.businessMetric?.trim(),
        node.data.confidenceCheck?.trim(),
      ].filter(Boolean);

      const detailText = details.length ? `\n  - Details: ${details.join(" | ")}` : "";
      const bodyText = body ? `\n  - ${body}` : "";
      return `- **${node.data.label || "Untitled"}**${bodyText}${detailText}`;
    })
    .join("\n");
}

export function createProjectMarkdown(project: ProjectRecord) {
  const sections = createSections(project.board);
  const critique = project.critique;

  const critiqueLines = critique
    ? critique.critiqueItems.length
      ? critique.critiqueItems.map((item) => `- [${item.severity.toUpperCase()}] ${item.message} — ${item.recommendation}`).join("\n")
      : "- _No critique findings yet._"
    : "- _No critique run yet._";

  const assumptions = project.assumptions.length ? project.assumptions.map((item) => `- ${item}`).join("\n") : "- _No assumptions captured yet._";

  const sectionBlocks = sections
    .map((section) => `## ${section.title}\n${markdownListForNodes(section.entries)}`)
    .join("\n\n");

  return `# ${project.title || "Untitled design"}

## Summary
${project.summary || "No summary yet."}

## Target user
${project.audience || "Not specified"}

## Initiative
${project.ideaPrompt || "Not specified"}

## Context / problem
${project.contextProblem || "Not specified"}

## Desired outcome
${project.desiredOutcome || "Not specified"}

## Constraints
${project.constraints || "None"}

## Human involvement / escalation expectation
${project.humanInvolvement || "Not specified"}

## Risk level (optional)
${project.riskLevel || "Not specified"}

${sectionBlocks}

## Critique summary
${critique?.summary || "No critique run yet."}

### Critique findings
${critiqueLines}

## Assumptions
${assumptions}
`;
}

export function createProjectJson(project: ProjectRecord) {
  return JSON.stringify(
    {
      version: "ades.v1",
      exportedAt: new Date().toISOString(),
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        ideaPrompt: project.ideaPrompt,
        audience: project.audience,
        contextProblem: project.contextProblem,
        desiredOutcome: project.desiredOutcome,
        constraints: project.constraints,
        humanInvolvement: project.humanInvolvement,
        riskLevel: project.riskLevel,
        status: project.status,
        summary: project.summary,
        assumptions: project.assumptions,
        critiqueSeed: project.critiqueSeed,
        critique: project.critique,
      },
      board: project.board,
    },
    null,
    2
  );
}

export function parseImportJson(raw: string): {
  board: AdesBoardSnapshot;
  summary: string;
  ideaPrompt: string;
  audience: string;
  contextProblem: string;
  desiredOutcome: string;
  constraints: string;
  humanInvolvement: string;
  riskLevel: "" | "low" | "medium" | "high";
  critique: CritiqueResult | null;
  title?: string;
} {
  const parsed = JSON.parse(raw) as {
    board?: AdesBoardSnapshot;
    project?: {
      summary?: string;
      ideaPrompt?: string;
      audience?: string;
      contextProblem?: string;
      desiredOutcome?: string;
      constraints?: string;
      humanInvolvement?: string;
      riskLevel?: "" | "low" | "medium" | "high";
      critique?: CritiqueResult | null;
      title?: string;
    };
  };

  if (!parsed.board || !Array.isArray(parsed.board.nodes) || !Array.isArray(parsed.board.edges)) {
    throw new Error("The imported JSON is missing a valid board snapshot.");
  }

  return {
    board: parsed.board,
    summary: parsed.project?.summary ?? "",
    ideaPrompt: parsed.project?.ideaPrompt ?? "",
    audience: parsed.project?.audience ?? "",
    contextProblem: parsed.project?.contextProblem ?? "",
    desiredOutcome: parsed.project?.desiredOutcome ?? "",
    constraints: parsed.project?.constraints ?? "",
    humanInvolvement: parsed.project?.humanInvolvement ?? "",
    riskLevel: parsed.project?.riskLevel === "low" || parsed.project?.riskLevel === "medium" || parsed.project?.riskLevel === "high" ? parsed.project.riskLevel : "",
    critique: parsed.project?.critique ?? null,
    title: parsed.project?.title,
  };
}

export function downloadTextFile(filename: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
