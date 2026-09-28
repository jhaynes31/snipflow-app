import { db, getSettings } from "./db";
import { loadTemplates } from "./templates";

/** Phase 1 team: Strategist, Copywriter, Editor. Idempotent: run it any time. */
const PHASE_1_ROLES = ["strategist", "copywriter", "editor"];

export async function seed() {
  await getSettings();
  const project =
    (await db.project.findFirst({ where: { name: "Demo Project" } })) ??
    (await db.project.create({
      data: {
        name: "Demo Project",
        description: "A sandbox project for trying the engine in demo mode.",
        brandKit: { name: "Demo", voice: "Warm, plain, friendly.", avoid: ["hype", "guarantees"] },
      },
    }));

  for (const t of loadTemplates().filter((t) => PHASE_1_ROLES.includes(t.role))) {
    if (await db.agent.findFirst({ where: { role: t.role } })) continue;
    await db.agent.create({
      data: {
        name: t.defaultName,
        role: t.role,
        team: t.team,
        avatarSpriteKey: t.avatarSpriteKey,
        personality: t.personalityOptions[0],
        systemPrompt: t.systemPrompt,
        skills: t.skills,
        tools: t.tools,
        model: t.model,
        dailyTokenBudget: t.dailyTokenBudget,
        shift: t.shift,
      },
    });
  }
  return project;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const p = await seed();
  console.log(`Seeded. Project "${p.name}" and the Phase 1 team are ready.`);
  await db.$disconnect();
}
