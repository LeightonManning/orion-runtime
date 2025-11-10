import { z } from "zod";

/**
 * Agent roles Orion knows about.
 * You can add more roles later without changing the core types.
 */
export const AgentRoleSchema = z.union([
  z.literal("planner"),
  z.literal("worker"),
  z.literal("critic"),
  // allow custom roles without schema changes
  z.string().min(1)
]);

export type AgentRole = z.infer<typeof AgentRoleSchema>;

/**
 * Base envelope for any message on the Orion bus.
 */
export const BaseMessageSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().min(1),
  kind: z.string().min(1), // e.g. "control:start", "plan:proposed"
  timestamp: z.string().datetime().optional(),
  sender: z
    .object({
      role: AgentRoleSchema,
      name: z.string().min(1).optional()
    })
    .optional()
});

export type BaseMessage = z.infer<typeof BaseMessageSchema>;

/**
 * CONTROL MESSAGES
 * -----------------
 * Orchestrator → agents, or system-level notifications.
 */

export const ControlStartSchema = BaseMessageSchema.extend({
  kind: z.literal("control:start"),
  goal: z.string().min(1)
});

export const ControlDoneSchema = BaseMessageSchema.extend({
  kind: z.literal("control:done"),
  status: z.enum(["success", "failed", "cancelled"]),
  summary: z.string().optional()
});

export const ControlReadySchema = BaseMessageSchema.extend({
  kind: z.literal("control:ready"),
  agent: AgentRoleSchema
});

export const ControlMessageSchema = z.union([
  ControlStartSchema,
  ControlDoneSchema,
  ControlReadySchema
]);

export type ControlStartMessage = z.infer<typeof ControlStartSchema>;
export type ControlDoneMessage = z.infer<typeof ControlDoneSchema>;
export type ControlReadyMessage = z.infer<typeof ControlReadySchema>;
export type ControlMessage = z.infer<typeof ControlMessageSchema>;

/**
 * PLAN MESSAGES
 * -------------
 * Planner → memory + downstream agents.
 */

export const PlanCreatedSchema = BaseMessageSchema.extend({
  kind: z.literal("plan:created"),
  steps: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      status: z.enum(["pending", "in-progress", "done"]).default("pending")
    })
  )
});

export const PlanUpdatedSchema = BaseMessageSchema.extend({
  kind: z.literal("plan:updated"),
  steps: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      status: z.enum(["pending", "in-progress", "done"])
    })
  )
});

export const PlanMessageSchema = z.union([
  PlanCreatedSchema,
  PlanUpdatedSchema
]);

export type PlanCreatedMessage = z.infer<typeof PlanCreatedSchema>;
export type PlanUpdatedMessage = z.infer<typeof PlanUpdatedSchema>;
export type PlanMessage = z.infer<typeof PlanMessageSchema>;

/**
 * WORK MESSAGES
 * -------------
 * Worker ↔ runtime, carrying artifacts and intermediate outputs.
 */

export const WorkRequestedSchema = BaseMessageSchema.extend({
  kind: z.literal("work:requested"),
  stepId: z.string(),
  input: z.any().optional()
});

export const WorkCompletedSchema = BaseMessageSchema.extend({
  kind: z.literal("work:completed"),
  stepId: z.string(),
  artifact: z.any(), // can tighten later (e.g. string | JSON)
  notes: z.string().optional()
});

export const WorkFailedSchema = BaseMessageSchema.extend({
  kind: z.literal("work:failed"),
  stepId: z.string(),
  error: z.string(),
  retryable: z.boolean().default(false)
});

export const WorkMessageSchema = z.union([
  WorkRequestedSchema,
  WorkCompletedSchema,
  WorkFailedSchema
]);

export type WorkRequestedMessage = z.infer<typeof WorkRequestedSchema>;
export type WorkCompletedMessage = z.infer<typeof WorkCompletedSchema>;
export type WorkFailedMessage = z.infer<typeof WorkFailedSchema>;
export type WorkMessage = z.infer<typeof WorkMessageSchema>;

/**
 * CRITIQUE MESSAGES
 * -----------------
 * Critic → runtime, evaluating artifacts / plans.
 */

export const CritiqueRequestedSchema = BaseMessageSchema.extend({
  kind: z.literal("critique:requested"),
  artifactSummary: z.string().optional()
});

export const CritiqueProvidedSchema = BaseMessageSchema.extend({
  kind: z.literal("critique:provided"),
  verdict: z.enum(["accept", "revise", "reject"]),
  rationale: z.string().optional()
});

export const CritiqueMessageSchema = z.union([
  CritiqueRequestedSchema,
  CritiqueProvidedSchema
]);

export type CritiqueRequestedMessage = z.infer<typeof CritiqueRequestedSchema>;
export type CritiqueProvidedMessage = z.infer<typeof CritiqueProvidedSchema>;
export type CritiqueMessage = z.infer<typeof CritiqueMessageSchema>;

/**
 * TOP-LEVEL ORION MESSAGE
 * -----------------------
 * Any message allowed on the bus.
 */

export const OrionMessageSchema = z.union([
  ControlMessageSchema,
  PlanMessageSchema,
  WorkMessageSchema,
  CritiqueMessageSchema
]);

export type OrionMessage = z.infer<typeof OrionMessageSchema>;
