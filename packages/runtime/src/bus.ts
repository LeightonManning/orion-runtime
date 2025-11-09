import { createClient, type RedisClientType } from "redis";
import { Msg, MsgSchema } from "./schema.js";

export class Bus {
  private sub!: RedisClientType;
  private pub!: RedisClientType;
  private channel = "orion:bus";

  async init(
    url: string | undefined = process.env.REDIS_URL || "redis://127.0.0.1:6379",
    onMessage?: (m: Msg) => void
  ) {
    this.sub = createClient({ url });
    this.pub = createClient({ url });

    this.sub.on("error", console.error);
    this.pub.on("error", console.error);

    await this.sub.connect();
    await this.pub.connect();

    if (onMessage) {
      await this.sub.subscribe(this.channel, (raw: string) => {
        try {
          const parsed = JSON.parse(raw);
          const m = MsgSchema.parse(parsed);
          onMessage(m);
        } catch (err) {
          console.error("Drop invalid msg:", err);
        }
      });
    } else {
      await this.sub.subscribe(this.channel, () => {});
    }
  }

  async publish(msg: Msg) {
    await this.pub.publish(this.channel, JSON.stringify(msg));
  }
}
