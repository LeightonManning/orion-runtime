import "dotenv/config";
import {
  initBus,
  MsgSchema,
  buildMsg,
  memSet,
  createLogger
} from "@orion/agent-kit";

async function mockLLMPlanner(goal: string) {
  return `{"plan":["Define requirements","Choose services","Design data flow","Outline scaling","List risks"]}`;
}

const NAME = "Planner";
const log = createLogger(NAME);

async function main() {
  const { sub, pub } = await initBus();

  await sub.subscribe("orion:bus", async (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      const result = MsgSchema.safeParse(parsed);
      if (!result.success) {
        log.warn("Received invalid message", {
          data: { error: result.error.format() }
        });
        return;
      }
      const m = result.data;

      if (m.type === "control" && m.content.startsWith("start:")) {
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
        await pub.publish("orion:bus", JSON.stringify(out));

        log.info("Published plan", {
          taskId: m.taskId
        });
      }
    } catch (err) {
      log.error("Failed to handle message", { error: err });
    }
  });

  await pub.publish(
    "orion:bus",
    JSON.stringify(
      buildMsg({
        taskId: "boot",
        from: NAME,
        type: "status",
        content: "ready"
      })
    )
  );

  log.info("ready");
}

main().catch((e) => {
  log.error("Planner crashed", { error: e });
  process.exit(1);
});
