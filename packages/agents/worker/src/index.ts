// packages/agents/worker/src/index.ts
import { initBus, MsgSchema, buildMsg, memGet, memSet } from "@orion/agent-kit";

async function mockLLMWorker(input: string) {
  return `Artifact: Drafted section for "${input.slice(
    0,
    60
  )}..." with bullet points and a diagram stub.`;
}

const NAME = "Worker";

async function main() {
  const { sub, pub } = await initBus();

  await sub.subscribe("orion:bus", async (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      const result = MsgSchema.safeParse(parsed);
      if (!result.success) {
        console.error("[Worker] invalid message", result.error.format());
        return;
      }
      const m = result.data;

      if (m.type === "plan") {
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
      }
    } catch (err) {
      console.error("[Worker] failed to handle message", err);
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
