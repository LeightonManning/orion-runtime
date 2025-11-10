import { MsgSchema, type Msg, initBus, buildMsg } from "./core.js";
import { createLogger } from "./logger.js";

export type AgentLogger = ReturnType<typeof createLogger>;

export interface AgentContext {
  /** Agent name (e.g. "Planner" | "Worker" | "Critic"). */
  name: string;
  /** Agent-specific logger (same as the current `log`). */
  log: AgentLogger;
  /** Publish a message back onto the Orion bus. */
  publish: (msg: Msg) => Promise<void>;
}

// ⬇️ Note the `<M extends Msg = Msg>` and the `filter` type-guard
export interface DefineAgentOptions<M extends Msg = Msg> {
  name: string;
  /**
   * Optional filter so the agent only sees messages it cares about.
   * If provided, it SHOULD be a type guard (msg is M) so `msg` is narrowed.
   */
  filter?: (msg: Msg) => msg is M;
  /**
   * Main handler for messages this agent handles.
   * - `msg` is already JSON-parsed and validated.
   * - If `filter` was provided as a type guard, `msg` will be narrowed to M.
   */
  onMessage: (msg: M, ctx: AgentContext) => Promise<void> | void;
}

/** Returned from defineAgent – call this from the agent entrypoint. */
export type StartAgent = () => Promise<void>;

/**
 * Standardises:
 * - initBus
 * - subscription + message parsing/dispatch
 * - ready handshake
 * - per-agent logging
 */
export function defineAgent<M extends Msg = Msg>(
  options: DefineAgentOptions<M>
): StartAgent {
  const { name, filter, onMessage } = options;
  const log = createLogger(name);

  const start: StartAgent = async () => {
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

        if (filter && !filter(m)) {
          // Agent not interested in this message.
          return;
        }

        // Here, if filter is a proper type guard, `m` is of type M
        await onMessage(m as M, {
          name,
          log,
          publish: async (outgoing: Msg) => {
            await pub.publish("orion:bus", JSON.stringify(outgoing));
          }
        });
      } catch (err) {
        log.error("Failed to handle message", { error: err });
      }
    });

    // Ready handshake – identical to before.
    await pub.publish(
      "orion:bus",
      JSON.stringify(
        buildMsg({
          taskId: "boot",
          from: name,
          type: "status",
          content: "ready"
        })
      )
    );

    log.info("ready");
  };

  return start;
}