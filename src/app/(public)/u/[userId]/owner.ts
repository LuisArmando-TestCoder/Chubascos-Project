import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { getUserProfile } from '@/actions/data';
import { resolveOwnerSegment } from '@/actions/data/handleStore';
import { profilePath } from '@/lib/handles';
import type { User } from '@/types';

/** One lookup per request, shared by generateMetadata and the page. */
const resolveCached = cache(async (segment: string) => {
  const owner = await resolveOwnerSegment(segment);
  if (!owner) return null;
  const user = await getUserProfile(owner.userId);
  return user ? { owner, user: { ...user, handle: owner.handle ?? user.handle } as User } : null;
});

/** For metadata: never redirects, never throws. */
export async function findOwner(segment: string): Promise<User | null> {
  return (await resolveCached(segment))?.user ?? null;
}

/**
 * The poet behind a `/u/<segment>` URL. Links shared before handles existed
 * carry an email: they still work, and land on the handle URL instead (308),
 * so the address bar and any re-shared link show the handle.
 * `rest` is the path after the segment (e.g. `/p/mi-poema`).
 */
export async function loadOwner(segment: string, rest = ''): Promise<User> {
  const found = await resolveCached(segment);
  if (!found) notFound();
  if (found.owner.shouldRedirect && found.owner.handle) {
    permanentRedirect(`${profilePath(found.owner.handle)}${rest}`);
  }
  return found.user;
}
