# 🧾 Changelog

All notable changes to **Orion** will be documented in this file.  
This project adheres to [Semantic Versioning](https://semver.org/).
Date format is DD-MM-YYYY.

---

## [0.2.0] – 10-11-2025

### Added
- `defineAgent()` helper in `@orion/agent-kit` for a unified agent lifecycle.
- Generic `AgentContext<C>` and `DefineAgentOptions<M, C>` with typed per-agent config.
- Example `PlannerConfig` (model, maxSteps) wired into Planner via `defineAgent<ControlMsg, PlannerConfig>`.
- Updated README to reflect the new `agent-kit` architecture and agent lifecycle.

### Changed
- All agents (Planner, Worker, Critic) now use `defineAgent` instead of hand-rolled Redis/pubsub loops.
- Centralised Redis bus setup, message parsing (`MsgSchema`), logging, and ready handshake inside `@orion/agent-kit`.
- Planner logs now include structured config metadata in `data.config` for better inspectability.

---

## [0.1.0] – 09-11-2025

### Added
- Initial multi-agent runtime skeleton:
  - Coordinator (runtime) for task orchestration and `control:start` / `control:done` flow.
  - Planner, Worker, Critic agents communicating over Redis `orion:bus`.
- Shared task memory abstraction (`orion:memory:<taskId>`) backed by Redis hashes.
- Basic structured JSONL logging:
  - Global log: `logs/orion.log`
  - Per-task logs: `logs/<taskId>.jsonl`
- Example end-to-end workflow:
  - Coordinator sends a goal.
  - Planner generates a plan.
  - Worker produces an artifact.
  - Critic evaluates and completes the task.
