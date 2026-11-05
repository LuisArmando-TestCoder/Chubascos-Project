import { getSession } from '@/actions/auth';

export const FORBIDDEN = { success: false as const, error: 'Sin permiso.' };

/**
 * Server actions are public HTTP endpoints: any `userId` argument is a claim
 * made by the browser, never proof. Every write compares that claim with the
 * signed session cookie and refuses on mismatch.
 */
export async function isActor(claimedUserId: unknown): Promise<boolean> {
  if (typeof claimedUserId !== 'string' || !claimedUserId) return false;
  const session = await readSession();
  return Boolean(session?.isLoggedIn && session.userId && session.userId === claimedUserId);
}

/** Same check for the email-keyed social actions. */
export async function isActorEmail(claimedEmail: unknown): Promise<boolean> {
  if (typeof claimedEmail !== 'string' || !claimedEmail) return false;
  const session = await readSession();
  return Boolean(session?.isLoggedIn && session.email && session.email === claimedEmail.toLowerCase().trim());
}

/** Outside a request (scripts, cron) there is no cookie: that is "nobody". */
async function readSession() {
  try {
    return await getSession();
  } catch {
    return null;
  }
}
