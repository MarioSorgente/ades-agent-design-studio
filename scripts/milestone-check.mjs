import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "docs/ADES_MASTER_SPEC.md",
  "docs/CODEX_RULES.md",
  "docs/EXTERNAL_SETUP_GUIDE.md",
  "docs/AGENTS.md",
  "docs/MILESTONES.md",
  "app/page.tsx",
  "app/sign-in/page.tsx",
  "app/dashboard/page.tsx",
  "app/project/[id]/page.tsx",
  "components/auth/protected-route.tsx",
  "components/board/studio-board.tsx",
  "app/api/generate/route.ts",
  "app/api/critique/route.ts"
];

const requiredContentChecks = [
  { file: "app/api/generate/route.ts", includes: ["responses.create", "json_schema", "businessMetric"] },
  { file: "app/api/critique/route.ts", includes: ["missingBusinessMetrics", "missingEvals", "missingReflections"] },
  { file: "app/project/[id]/page.tsx", includes: ["Run critique", "Add to board", "handleCritiqueBoard"] },
  { file: "lib/firebase/auth.ts", includes: ["browserLocalPersistence", "setPersistence"] }
];

const failures = [];

for (const file of requiredFiles) {
  try {
    await access(file);
  } catch {
    failures.push(`Missing file: ${file}`);
  }
}

for (const check of requiredContentChecks) {
  try {
    const content = await readFile(check.file, "utf8");

    for (const token of check.includes) {
      if (!content.includes(token)) {
        failures.push(`Missing content in ${check.file}: ${token}`);
      }
    }
  } catch {
    failures.push(`Unable to read file for content checks: ${check.file}`);
  }
}

if (failures.length) {
  console.error("Milestone verification failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Milestone verification checks passed for M0-M7.");
