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

export interface DefineAgentOptions {
  name: string;
  /**
   * Optional cheap filter so the agent only sees messages it cares about.
   * If omitted, all valid messages are passed to `onMessage`.
   */
  filter?: (msg: Msg) => boolean;
  /**
   * Main handler for messages this agent handles.
   * - `msg` is already JSON-parsed and validated against MsgSchema.
   * - Use `ctx.log` and `ctx.publish` instead of wiring Redis yourself.
   */
  onMessage: (msg: Msg, ctx: AgentContext) => Promise<void> | void;
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
export function defineAgent(options: DefineAgentOptions): StartAgent {
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

        await onMessage(m, {
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

    // Ready handshake – identical to the existing agents.
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