# 🛸️ Orion  
*A minimal multi-agent runtime for orchestrating LLM-based systems.*

---

## Overview

**Orion** is a TypeScript + Redis framework for building and coordinating multiple AI "agents" — independent processes that communicate through a shared message bus.  
It’s designed to be *simple, transparent, and extensible* — perfect for experimentation, learning, or scaling into production systems.

---

## ✨ Features

- ⚙️ **Modular architecture** — Coordinator + independent agents  
- 🔁 **Redis Pub/Sub bus** — real-time message passing between agents  
- 🧠 **Shared memory** — Redis hash per task (plan, artifact, etc.)  
- ⏳ **Ready handshake** — agents announce readiness before task start  
- 🪵 **Structured logs (coming soon)** — JSONL task logs and summaries  
- 🤖 **LLM-agnostic design** — supports OpenAI, Anthropic, or local models  
- 🧩 **Composable roles** — planner, worker, critic, or your own custom agents  
- 🔒 **Privacy-first architecture** — in-environment processing and PII control  

---

## 🧮 Tech Stack

| Component | Purpose |
|------------|----------|
| **Node.js + TypeScript (ESM)** | Core runtime & agent logic |
| **Redis** | Pub/Sub messaging & shared memory |
| **Docker Compose** | Local orchestration |
| **tsx** | Fast TypeScript execution |
| **zod** | Schema validation for messages |
| **uuid** | Unique IDs for tasks and messages |

---

## 🚀 Quick Start

### 1. Prerequisites
- Docker Desktop running  
- Node.js ≥ 18  
- Redis (auto-started via Docker)

### 2. Clone & install

```bash
git clone https://github.com/LeightonManning/orion-runtime.git
cd orion-runtime
npm install
```

### 3. Run

```bash
docker compose -f infra/docker-compose.yml up -d redis
npm run dev
```

You should see output similar to:
```
[Planner] ready
[Worker] ready
[Critic] ready
✅ Task ... finished by Critic: done: artifact meets acceptance
```

---

## 🧩 Architecture

```
orion/
 ├─ infra/
 │   └─ docker-compose.yml   # Redis
 ├─ packages/
 │   ├─ runtime/             # Coordinator (core bus + schema)
 │   └─ agents/
 │       ├─ planner/
 │       ├─ worker/
 │       └─ critic/
 ├─ .env
 ├─ package.json
 └─ tsconfig.json
```

Each agent:
- Subscribes to the Redis `orion:bus` channel  
- Reacts to specific message types (`control`, `plan`, `work`, `critique`)  
- Reads/writes to shared memory (`orion:memory:<taskId>`)

The coordinator:
- Waits for all agents to announce readiness  
- Sends a `control:start` message with a goal  
- Monitors the workflow until completion (`control:done`)

---

## 🧠 Design Philosophy

> “Transparent. Inspectable. Human-in-the-loop by default.”

Orion prioritizes *runtime-driven control*, *minimal prompt dependence*, and *code-as-API execution*.

It aligns with modern **MCP-inspired** agent design:
- Code-as-API tool usage (no bloated in-prompt schemas)  
- Progressive tool discovery  
- In-environment data processing  
- Runtime-controlled loops and branching  
- State persistence for long-running tasks  
- Reusable skills and cached tool calls  
- Privacy-safe execution

These principles make Orion efficient, scalable, and LLM-agnostic — the runtime, not the model, is in charge.

---

## 🦯 Roadmap

- [x] Create `@orion/agent-kit` shared library (bus, schema, memory, logger)
- [x] Structured JSONL logging (`logs/<taskId>.jsonl`)
- [ ] Add CLI flags (`--goal`, `--max-turns`, `--topic`)
- [ ] Replace mock LLMs with real model wrapper (`MOCK_LLM=true` fallback)
- [ ] Minimal web UI (timeline + memory viewer)
- [ ] Add Redis Streams backend for persistence
- [ ] Long-running tasks & checkpoint resuming
- [ ] Plugin system for new agent roles

---

## 🛠️ Example Workflow

1. **Coordinator** starts the system with a goal  
2. **Planner** generates a plan  
3. **Worker** executes it and produces an artifact  
4. **Critic** evaluates and finalizes the task  
5. Result logged and saved to memory

---

## 🔧 Configuration

Orion reads a few environment variables:

- `REDIS_URL` – Redis connection string (default: `redis://127.0.0.1:6379`)
- `ORION_LOG_DIR` – directory for log files (default: `<cwd>/logs`)
- `ORION_LOG_LEVEL` – `debug` | `info` | `warn` | `error` (default: `info`)

You can provide these via your shell, Docker, or a local `.env` file (loaded with `dotenv`).

---

## 🤝 Open Source License

Orion is open source under the [MIT License](./LICENSE).

You are free to use, modify, and distribute it for both personal and commercial purposes.

---

## 🧑‍💻 Author

**Leighton** — Solutions Architect (UK)  
GitHub: [@LeightonManning](https://github.com/LeightonManning)

---

> Orion — *A constellation of agents, working together under one runtime.*