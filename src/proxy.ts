import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Since the provided Redis is a standard Redis Cloud instance and not Upstash,
// we'll use a standard Redis client for Node.js runtimes (Server Actions/APIs).
// However, Middleware runs on the Edge runtime which has restricted networking.
// If the provided Redis does not have a REST API, we must use it in a Node.js API route.

let ratelimit: Ratelimit | null = null;

// Attempting to use the provided Redis credentials via Upstash-compatible REST if available,
// or falling back to an internal API guard if not.
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(300, '1 m'),
    analytics: true,
  });
}

export async function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/static') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || 'anonymous';

  // If we have a native edge-compatible ratelimiter (Upstash)
  if (ratelimit) {
    try {
      const { success, limit, remaining, reset } = await ratelimit.limit(ip);
      if (!success) {
        return new NextResponse(
          JSON.stringify({ error: 'Demasiadas solicitudes.' }),
          {
            status: 429,
            headers: { 'content-type': 'application/json', 'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString() },
          }
        );
      }
      return NextResponse.next();
    } catch (error) {
      console.error('Edge ratelimit error:', error);
      return NextResponse.next();
    }
  }

  // If no Upstash credentials, we bypass Edge rate limiting. 
  // Calling an internal API route from Edge middleware via `fetch` on Netlify
  // often leads to AbortError or timeout loops.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/guard/check).*)'],
};
