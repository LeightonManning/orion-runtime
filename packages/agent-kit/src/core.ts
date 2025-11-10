import { createClient } from "redis";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

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

export type ControlMsg = Msg & { type: "control" };
export type PlanMsg = Msg & { type: "plan" };
export type WorkMsg = Msg & { type: "work" };
export type CritiqueMsg = Msg & { type: "critique" };
export type StatusMsg = Msg & { type: "status" };
export type ToolMsg = Msg & { type: "tool" };

export const isControlMsg = (msg: Msg): msg is ControlMsg =>
  msg.type === "control";

export const isPlanMsg = (msg: Msg): msg is PlanMsg =>
  msg.type === "plan";

export const isWorkMsg = (msg: Msg): msg is WorkMsg =>
  msg.type === "work";

export const isCritiqueMsg = (msg: Msg): msg is CritiqueMsg =>
  msg.type === "critique";

export const isStatusMsg = (msg: Msg): msg is StatusMsg =>
  msg.type === "status";

export const isToolMsg = (msg: Msg): msg is ToolMsg =>
  msg.type === "tool";

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