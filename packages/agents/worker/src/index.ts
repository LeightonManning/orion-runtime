import "dotenv/config";
import {
  defineAgent,
  buildMsg,
  memGet,
  memSet,
  type Msg
} from "@orion/agent-kit";

async function mockLLMWorker(input: string) {
  return `Artifact: Drafted section for "${input.slice(
    0,
    60
  )}..." with bullet points and a diagram stub.`;
}

const NAME = "Worker";

const startWorker = defineAgent({
  name: NAME,
  // Same semantics as before: only handle plan messages.
  filter: (m: Msg) => m.type === "plan",
  onMessage: async (m, { log, publish }) => {
    // This is effectively the old:
    // if (m.type === "plan") { ... }
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
    await publish(out);

    log.info("Published work artifact", { taskId: m.taskId });
  }
});

startWorker().catch((e) => {
  // Fallback logging if something goes wrong before logger is fully wired.
  // eslint-disable-next-line no-console
  console.error("Worker crashed", e);
  process.exit(1);
});
