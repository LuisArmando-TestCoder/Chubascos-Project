import { NextResponse } from 'next/server';
import { getRedisClient } from '@/utils/redis';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ip = searchParams.get('ip');

  if (!ip) return NextResponse.json({ allowed: true });

  const limits = {
    minute: 300,
    hour: 5000
  };

  try {
    const redis = await getRedisClient();
    const now = new Date();
    const minuteKey = `limit:${ip}:min:${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
    const hourKey = `limit:${ip}:hour:${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;

    // Use Redis INCR for atomic counting with TTL
    const [minCount, hourCount] = await Promise.all([
      redis.incr(minuteKey),
      redis.incr(hourKey)
    ]);

    // Set TTL on new keys
    if (minCount === 1) await redis.expire(minuteKey, 65); // 1 min + buffer
    if (hourCount === 1) await redis.expire(hourKey, 3605); // 1 hour + buffer

    if (minCount > limits.minute || hourCount > limits.hour) {
      return NextResponse.json({ allowed: false });
    }

    return NextResponse.json({ allowed: true });
  } catch (error) {
    console.error('Redis guard error:', error);
    // Fail open if Redis is down
    return NextResponse.json({ allowed: true });
  }
}
