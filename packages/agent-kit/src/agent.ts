import { MsgSchema, type Msg, initBus, buildMsg } from "./core.js";
import { createLogger } from "./logger.js";

export type AgentLogger = ReturnType<typeof createLogger>;

// C = config type (per agent), default unknown so existing callers still work.
export interface AgentContext<C = unknown> {
  /** Agent name (e.g. "Planner" | "Worker" | "Critic"). */
  name: string;
  /** Agent-specific logger (same as your current `log`). */
  log: AgentLogger;
  /** Publish a message back onto the Orion bus. */
  publish: (msg: Msg) => Promise<void>;
  /** Agent-specific configuration, typed per agent. */
  config: C;
}

// M = message type, C = config type
export interface DefineAgentOptions<M extends Msg = Msg, C = unknown> {
  name: string;
  /**
   * Optional agent configuration. Typed per agent via generic C.
   * If omitted, C will typically be `undefined` at runtime.
   */
  config?: C;
  /**
   * Optional filter so the agent only sees messages it cares about.
   * If provided, it SHOULD be a type guard (msg is M) so `msg` is narrowed.
   */
  filter?: (msg: Msg) => msg is M;
  /**
   * Main handler for messages this agent handles.
   * - `msg` is already JSON-parsed and validated.
   * - If `filter` was provided as a type guard, `msg` will be narrowed to M.
   * - `ctx.config` is the typed configuration for this agent.
   */
  onMessage: (msg: M, ctx: AgentContext<C>) => Promise<void> | void;
}

/** Returned from defineAgent – call this from the agent entrypoint. */
export type StartAgent = () => Promise<void>;

/**
 * Standardises:
 * - initBus
 * - subscription + message parsing/dispatch
 * - ready handshake
 * - per-agent logging
 * - per-agent config wiring
 */
export function defineAgent<M extends Msg = Msg, C = unknown>(
  options: DefineAgentOptions<M, C>
): StartAgent {
  const { name, filter, onMessage, config } = options;
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

        await onMessage(m as M, {
          name,
          log,
          publish: async (outgoing: Msg) => {
            await pub.publish("orion:bus", JSON.stringify(outgoing));
          },
          // At runtime this might be undefined if caller didn't pass config,
          // which is fine – the type parameter C can include undefined.
          config: config as C
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