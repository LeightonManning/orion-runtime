// packages/agents/critic/src/index.ts
import { initBus, MsgSchema, buildMsg } from "@orion/agent-kit";
import { memGet } from "./memory.js";

async function mockLLMCritic(artifact: string) {
  const needsRevision = /stub/i.test(artifact);
  if (needsRevision) return `Score: 8/10. Acceptable. control:done`;
  return `Score: 9/10. control:done`;
}

const NAME = "Critic";

async function main() {
  const { sub, pub } = await initBus();

  await sub.subscribe("orion:bus", async (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      const result = MsgSchema.safeParse(parsed);
      if (!result.success) {
        console.error("[Critic] invalid message", result.error.format());
        return;
      }
      const m = result.data;

      if (m.type === "work") {
        const latest = await memGet<string>(m.taskId, "artifact"); // demo read
        const review = await mockLLMCritic(latest ?? m.content);

        const critique = buildMsg({
          taskId: m.taskId,
          from: NAME,
          type: "critique",
          content: review
        });
        await pub.publish("orion:bus", JSON.stringify(critique));

        if (/control:done/i.test(review)) {
          const done = buildMsg({
            taskId: m.taskId,
            from: NAME,
            type: "control",
            content: "done: artifact meets acceptance"
          });
          await pub.publish("orion:bus", JSON.stringify(done));
        }
      }
    } catch (err) {
      console.error("[Critic] failed to handle message", err);
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
  console.log(`[${NAME}] ready`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
