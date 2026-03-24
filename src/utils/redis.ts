import { createClient } from 'redis';

let client: any = null;

export async function getRedisClient() {
  if (client) return client;

  client = createClient({
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT) || 11588
    }
  });

  client.on('error', (err: any) => console.error('Redis Client Error', err));

  if (!client.isOpen) {
    await client.connect();
  }

  return client;
}
