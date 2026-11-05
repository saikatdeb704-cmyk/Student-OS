import fs from "node:fs";
import path from "node:path";

const agents = [
  "academic",
  "study",
  "tutor",
  "exam",
  "career",
  "skill",
  "project",
  "opportunity",
  "research",
  "productivity",
  "notes",
  "communication",
  "performance",
  "finance",
  "wellbeing",
];

for (const slug of agents) {
  const dir = path.resolve(process.cwd(), `src/agents/${slug}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const content = `export { ${slug}Agent, ${slug}Agent as default } from "../../lib/agents/configs/${slug}.agent.ts";\n`;
  fs.writeFileSync(path.join(dir, "index.ts"), content, "utf8");
}

console.log("Scaffolded all 15 remaining agent directories in src/agents/");

