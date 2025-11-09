import { createClient } from "redis";

export function taskKey(taskId: string) {
  return `orion:memory:${taskId}`;
}

export async function withRedis<T>(fn: (client: any) => Promise<T>) {
  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  const client = createClient({ url });
  client.on("error", console.error);
  await client.connect();
  try { return await fn(client); }
  finally { await client.quit(); }
}

export async function memSet(taskId: string, field: string, value: unknown) {
  return withRedis(async (r) => {
    await r.hSet(taskKey(taskId), field, JSON.stringify(value));
  });
}
export async function memGet<T=unknown>(taskId: string, field: string): Promise<T | null> {
  return withRedis(async (r) => {
    const raw = await r.hGet(taskKey(taskId), field);
    return raw ? JSON.parse(raw) as T : null;
  });
}
