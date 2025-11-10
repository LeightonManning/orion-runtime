import "dotenv/config";
import {
  initBus,
  MsgSchema,
  buildMsg,
  memGet,
  createLogger
} from "@orion/agent-kit";

async function mockLLMCritic(artifact: string) {
  const needsRevision = /stub/i.test(artifact);
  if (needsRevision) return `Score: 8/10. Acceptable. control:done`;
  return `Score: 9/10. control:done`;
}

const NAME = "Critic";
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

      if (m.type === "work") {
        log.info("Received work artifact", { taskId: m.taskId });

        const latest = await memGet<string>(m.taskId, "artifact");
        const review = await mockLLMCritic(latest ?? m.content);

        const critique = buildMsg({
          taskId: m.taskId,
          from: NAME,
          type: "critique",
          content: review
        });
        await pub.publish("orion:bus", JSON.stringify(critique));

        log.info("Published critique", { taskId: m.taskId });

        if (/control:done/i.test(review)) {
          const done = buildMsg({
            taskId: m.taskId,
            from: NAME,
            type: "control",
            content: "done: artifact meets acceptance"
          });
          await pub.publish("orion:bus", JSON.stringify(done));

          log.info("Published control:done", { taskId: m.taskId });
        }
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
  log.error("Critic crashed", { error: e });
  process.exit(1);
});
