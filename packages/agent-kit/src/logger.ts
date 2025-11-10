import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function parseLogLevel(raw: string | undefined): LogLevel {
  switch ((raw || "").toLowerCase()) {
    case "debug":
      return "debug";
    case "warn":
      return "warn";
    case "error":
      return "error";
    case "info":
    default:
      return "info";
  }
}

const MIN_LEVEL: LogLevel = parseLogLevel(process.env.ORION_LOG_LEVEL);

// Resolve a stable project root based on this file's location
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// agent-kit is at: <root>/packages/agent-kit/src/logger.ts
// so root is three levels up from src/logger.ts
const ROOT_DIR = path.resolve(__dirname, "../../..");

/**
 * Where to store log files.
 * Default: "<root>/logs"
 *
 * You can override via ORION_LOG_DIR.
 * - If ORION_LOG_DIR is absolute, it's used as-is.
 * - If ORION_LOG_DIR is relative, it's resolved relative to ROOT_DIR.
 */
const LOG_DIR = process.env.ORION_LOG_DIR
  ? path.isAbsolute(process.env.ORION_LOG_DIR)
    ? process.env.ORION_LOG_DIR
    : path.resolve(ROOT_DIR, process.env.ORION_LOG_DIR)
  : path.join(ROOT_DIR, "logs");

let ensureDirPromise: Promise<void> | undefined;

async function ensureLogDir(): Promise<void> {
  if (!ensureDirPromise) {
    ensureDirPromise = fs.promises
      .mkdir(LOG_DIR, { recursive: true })
      .catch((err) => {
        console.error("[Logger] Failed to create log directory:", err);
      })
      .then(() => {}); // ensures Promise<void>
  }
  return ensureDirPromise;
}

async function appendLine(filename: string, line: string): Promise<void> {
  await ensureLogDir();
  try {
    await fs.promises.appendFile(filename, line, "utf8");
  } catch (err) {
    // Swallow file I/O errors: logging should never take the app down.
    console.error("[Logger] Failed to append log line:", err);
  }
}

export interface LogContext {
  taskId?: string;
  data?: Record<string, unknown>;
  // you can add more context later (e.g. spanId, correlationId)
}

/**
 * Structured log entry shape written to JSONL.
 */
export interface LogEntry {
  ts: string;
  level: LogLevel;
  component: string;
  taskId?: string;
  msg: string;
  data?: Record<string, unknown>;
}

/**
 * Public Logger interface.
 */
export interface Logger {
  debug(msg: string, ctx?: LogContext): void;
  info(msg: string, ctx?: LogContext): void;
  warn(msg: string, ctx?: LogContext): void;
  error(msg: string, ctx?: LogContext & { error?: unknown }): void;
}

/**
 * Create a logger bound to a specific component name (e.g. "Planner").
 * Each log:
 *  - prints to console
 *  - writes a JSONL line to:
 *      logs/orion.log                    (global)
 *      logs/<taskId>.jsonl  (if taskId provided)
 */
export function createLogger(component: string): Logger {
  function shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[MIN_LEVEL];
  }

  function logToConsole(level: LogLevel, entry: LogEntry) {
    const prefix = `[${entry.component}]${
      entry.taskId ? ` [${entry.taskId}]` : ""
    }`;

    const text = `${prefix} ${entry.msg}`;

    switch (level) {
      case "debug":
      case "info":
        console.log(text);
        break;
      case "warn":
        console.warn(text);
        break;
      case "error":
        console.error(text);
        break;
    }
  }

  function log(level: LogLevel, msg: string, ctx?: LogContext): void {
    if (!shouldLog(level)) return;

    const ts = new Date().toISOString();
    const entry: LogEntry = {
      ts,
      level,
      component,
      msg,
      taskId: ctx?.taskId,
      data: ctx?.data
    };

    // Console
    logToConsole(level, entry);

    // File(s)
    const line = JSON.stringify(entry) + "\n";
    const globalFile = path.join(LOG_DIR, "orion.log");
    void appendLine(globalFile, line);

    if (entry.taskId) {
      const taskFile = path.join(LOG_DIR, `${entry.taskId}.jsonl`);
      void appendLine(taskFile, line);
    }
  }

  return {
    debug(msg, ctx) {
      log("debug", msg, ctx);
    },
    info(msg, ctx) {
      log("info", msg, ctx);
    },
    warn(msg, ctx) {
      log("warn", msg, ctx);
    },
    error(msg, ctx) {
      const data = {
        ...(ctx?.data || {}),
        // if an Error object is passed in data.error, serialize it roughly
        ...(ctx?.error instanceof Error
          ? { error: { message: ctx.error.message, stack: ctx.error.stack } }
          : ctx?.error
          ? { error: String(ctx.error) }
          : {})
      };
      log("error", msg, { taskId: ctx?.taskId, data });
    }
  };
}