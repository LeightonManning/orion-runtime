import { initBus, MsgSchema, buildMsg } from "./agentlib.js";
import { memSet } from "./memory.js";

async function mockLLMPlanner(goal: string) {
  return `{"plan":["Define requirements","Choose services","Design data flow","Outline scaling","List risks"]}`;
}

const NAME = "Planner";

async function main() {
  const { sub, pub } = await initBus();

  await sub.subscribe("orion:bus", async (raw: string) => {
    try {
      const m = MsgSchema.parse(JSON.parse(raw));
      if (m.type === "control" && m.content.startsWith("start:")) {
        const planJson = await mockLLMPlanner(m.content);
        await memSet(m.taskId, "plan", JSON.parse(planJson)); // store the plan
        const out = buildMsg({ taskId: m.taskId, from: NAME, type: "plan", content: planJson });
        await pub.publish("orion:bus", JSON.stringify(out));
      }
    } catch { /* drop */ }
  });
  await pub.publish("orion:bus", JSON.stringify(
    buildMsg({ taskId: "boot", from: NAME, type: "status", content: "ready" })
  ));
  console.log(`[${NAME}] ready`);
}
main().catch((e)=>{ console.error(e); process.exit(1); });
