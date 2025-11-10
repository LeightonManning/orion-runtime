import "dotenv/config";
import {
  defineAgent,
  buildMsg,
  memSet,
  type Msg
} from "@orion/agent-kit";

async function mockLLMPlanner(goal: string) {
  return `{"plan":["Define requirements","Choose services","Design data flow","Outline scaling","List risks"]}`;
}

const NAME = "Planner";

const startPlanner = defineAgent({
  name: NAME,
  // Same filter semantics as before: only care about control messages.
  filter: (m: Msg) => m.type === "control",
  onMessage: async (m, { log, publish }) => {
    // Preserve your existing start: check
    if (typeof m.content !== "string" || !m.content.startsWith("start:")) {
      return;
    }

    log.info("Received control:start", {
      taskId: m.taskId,
      data: { content: m.content }
    });

    const planJson = await mockLLMPlanner(m.content);
    await memSet(m.taskId, "plan", JSON.parse(planJson));

    const out = buildMsg({
      taskId: m.taskId,
      from: NAME,
      type: "plan",
      content: planJson
    });
    await publish(out);

    log.info("Published plan", {
      taskId: m.taskId
    });
  }
});

startPlanner().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("Planner crashed", e);
  process.exit(1);
});