import "dotenv/config";
import { Bus } from "./bus.js";
import { Msg, nowIso } from "./schema.js";
import { v4 as uuidv4 } from "uuid";

const goalArgIndex = process.argv.findIndex(a => a === "--goal");
const goal =
  (goalArgIndex >= 0 ? process.argv.slice(goalArgIndex + 1).join(" ") : "") ||
  process.env.ORION_GOAL ||
  "Hello Orion";

function msg(partial: Partial<Msg>): Msg {
  return {
    id: uuidv4(),
    taskId: partial.taskId!,
    ts: nowIso(),
    from: partial.from || "Coordinator",
    type: partial.type as Msg["type"],
    content: partial.content || "",
    to: partial.to,
    data: partial.data,
    meta: partial.meta
  };
}

async function main() {
  const bus = new Bus();
  const taskId = uuidv4();
  const MAX_TURNS = Number(process.env.ORION_MAX_TURNS || 10);
  let turns = 0;

  const required = new Set(["Planner", "Worker", "Critic"]);
  const ready = new Set<string>();
  let started = false;

  const kick = async () => {
    if (started) return;
    started = true;
    await bus.publish(
      msg({ taskId, type: "control", from: "Coordinator", content: `start: ${goal}` })
    );
  };

  await bus.init(undefined, (m: Msg) => {
    console.log(
      `[${m.taskId}] ${m.ts} ${m.from} -> ${m.to || "*"} [${m.type}] ${m.content}`
    );

    if (m.type === "status" && m.content === "ready" && required.has(m.from)) {
      ready.add(m.from);
      if (ready.size === required.size) {
        // all agents ready
        void kick();
      }
    }

    if (m.type === "control" && /done/i.test(m.content)) {
      console.log(`\n✅ Task ${m.taskId} finished by ${m.from}: ${m.content}\n`);
      process.exit(0);
    }

    if (++turns > MAX_TURNS) {
      console.log(`\n⏹️  Max turns reached (${MAX_TURNS}). Halting.\n`);
      process.exit(0);
    }
  });

  // Fallback: if agents don’t report ready within 2s, start anyway
  setTimeout(() => { void kick(); }, 2000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
