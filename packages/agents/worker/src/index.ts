import "dotenv/config";
import {
  initBus,
  MsgSchema,
  buildMsg,
  memGet,
  memSet,
  createLogger
} from "@orion/agent-kit";

async function mockLLMWorker(input: string) {
  return `Artifact: Drafted section for "${input.slice(
    0,
    60
  )}..." with bullet points and a diagram stub.`;
}

const NAME = "Worker";
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

      if (m.type === "plan") {
        log.info("Received plan", { taskId: m.taskId });

        const plan = await memGet<any>(m.taskId, "plan");
        const artifact = await mockLLMWorker(
          `Using plan ${JSON.stringify(plan)}`
        );

        await memSet(m.taskId, "artifact", artifact);

        const out = buildMsg({
          taskId: m.taskId,
          from: NAME,
          type: "work",
          content: artifact
        });
        await pub.publish("orion:bus", JSON.stringify(out));

        log.info("Published work artifact", { taskId: m.taskId });
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
  log.error("Worker crashed", { error: e });
  process.exit(1);
});
