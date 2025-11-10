// packages/agent-kit/src/index.ts
import { createClient } from "redis";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

export * from "./memory.js";
export * from "./logger.js";

/**
 * Canonical Orion message schema for the current runtime.
 * We can evolve this later (split control/plan/work/etc into sub-schemas),
 * but for now we just centralise the existing structure.
 */
export const MsgSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  ts: z.string(),
  from: z.string(),
  to: z.string().optional(),
  type: z.enum(["control", "plan", "work", "critique", "status", "tool"]),
  content: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  meta: z.record(z.string(), z.unknown()).optional()
});

export type Msg = z.infer<typeof MsgSchema>;

export const nowIso = () => new Date().toISOString();

export async function initBus() {
  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";

  const sub = createClient({ url });
  const pub = createClient({ url });

  sub.on("error", console.error);
  pub.on("error", console.error);

  await sub.connect();
  await pub.connect();

  return { sub, pub };
}

/**
 * Build a full message from a partial, filling in id/ts/etc.
 * NOTE: we assume the caller always provides taskId, from, type.
 */
export function buildMsg(partial: Partial<Msg>): Msg {
  return {
    id: uuidv4(),
    taskId: partial.taskId!,
    ts: nowIso(),
    from: partial.from!,
    to: partial.to,
    type: partial.type!,
    content: partial.content || "",
    data: partial.data,
    meta: partial.meta
  };
}
