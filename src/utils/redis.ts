import { createClient } from 'redis';

let client: any = null;

export async function getRedisClient() {
  if (client) return client;

  const url = process.env.KV_URL || process.env.REDIS_URL;

  if (url) {
    client = createClient({ url });
  } else {
    client = createClient({
      username: process.env.REDIS_USERNAME || 'default',
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379
      }
    });
  }

  client.on('error', (err: any) => console.error('Redis Client Error', err));

  if (!client.isOpen) {
    await client.connect();
  }

  return client;
}
