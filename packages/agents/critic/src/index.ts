import "dotenv/config";
import {
  defineAgent,
  buildMsg,
  memGet,
  type WorkMsg,
  isWorkMsg
} from "@orion/agent-kit";

async function mockLLMCritic(artifact: string) {
  const needsRevision = /stub/i.test(artifact);
  if (needsRevision) return `Score: 8/10. Acceptable. control:done`;
  return `Score: 9/10. control:done`;
}

const NAME = "Critic";

const startCritic = defineAgent<WorkMsg>({
  name: NAME,
  filter: isWorkMsg,
  onMessage: async (m, { log, publish }) => {
    // m.type is "work"
    log.info("Received work artifact", { taskId: m.taskId });

    const latest = await memGet<string>(m.taskId, "artifact");
    const review = await mockLLMCritic(latest ?? m.content);

    const critique = buildMsg({
      taskId: m.taskId,
      from: NAME,
      type: "critique",
      content: review
    });
    await publish(critique);

    log.info("Published critique", { taskId: m.taskId });

    if (/control:done/i.test(review)) {
      const done = buildMsg({
        taskId: m.taskId,
        from: NAME,
        type: "control",
        content: "done: artifact meets acceptance"
      });
      await publish(done);

      log.info("Published control:done", { taskId: m.taskId });
    }
  }
});

startCritic().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("Critic crashed", e);
  process.exit(1);
});
