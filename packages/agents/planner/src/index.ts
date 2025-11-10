// packages/agents/planner/src/index.ts
import "dotenv/config";
import {
  defineAgent,
  buildMsg,
  memSet,
  type ControlMsg,
  isControlMsg
} from "@orion/agent-kit";

async function mockLLMPlanner(goal: string) {
  return `{"plan":["Define requirements","Choose services","Design data flow","Outline scaling","List risks"]}`;
}

const NAME = "Planner";

type PlannerConfig = {
  /** Max number of planning steps / items to generate. */
  maxSteps: number;
  /** Logical model identifier, even if it’s just for mocks right now. */
  model: string;
};

// For now this is hard-coded; later we can load from env/JSON with zod.
const PLANNER_CONFIG: PlannerConfig = {
  maxSteps: 10,
  model: "mock:planner-v1"
};

const startPlanner = defineAgent<ControlMsg, PlannerConfig>({
  name: NAME,
  config: PLANNER_CONFIG,
  // Only handle control messages; narrowed via type guard
  filter: isControlMsg,
  onMessage: async (m, { log, publish, config }) => {
    if (typeof m.content !== "string" || !m.content.startsWith("start:")) {
      return;
    }

    log.info("Received control:start", {
      taskId: m.taskId,
      data: {
        content: m.content,
        config
      }
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
      taskId: m.taskId,
      data: {
        config: {
          model: config.model,
          maxSteps: config.maxSteps
        }
      }
    });
  }
});

startPlanner().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("Planner crashed", e);
  process.exit(1);
});
