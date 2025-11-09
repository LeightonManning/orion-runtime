import { z } from "zod";

export const MsgSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  ts: z.string(),
  from: z.string(),
  to: z.string().optional(),
  type: z.enum(["control","plan","work","critique","status","tool"]),
  content: z.string(),
  data: z.record(z.any()).optional(),
  meta: z.object({
    cost: z.number().optional(),
    tokensIn: z.number().optional(),
    tokensOut: z.number().optional()
  }).optional()
});
export type Msg = z.infer<typeof MsgSchema>;

export const nowIso = () => new Date().toISOString();
