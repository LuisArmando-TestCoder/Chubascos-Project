'use server';

import { updateTag } from 'next/cache';
import { isActor, FORBIDDEN } from './guard';
import { HANDLES_CACHE_TAG, changeHandleFor, isHandleFree } from './handleStore';
import { handleProblem, normalizeHandle } from '@/lib/handles';

/** Live check for the studio's "Dirección" field. */
export async function checkHandleAvailable(userId: string, wanted: string): Promise<{ available: boolean; reason?: string }> {
  const handle = normalizeHandle(String(wanted ?? ''));
  const problem = handleProblem(handle);
  if (problem) return { available: false, reason: problem };
  if (!(await isActor(userId))) return { available: true };
  return (await isHandleFree(handle, userId)) ? { available: true } : { available: false, reason: 'Esa dirección ya tiene dueño.' };
}

/** Deliberate change: old links with the previous handle stop working. */
export async function changeHandle(userId: string, wanted: string): Promise<{ success: true; handle: string } | { success: false; error: string }> {
  if (!(await isActor(userId))) return FORBIDDEN;
  const handle = normalizeHandle(String(wanted ?? ''));
  const problem = handleProblem(handle);
  if (problem) return { success: false, error: problem };
  const r = await changeHandleFor(userId, handle);
  if (!r.ok) return { success: false, error: r.error };
  updateTag(HANDLES_CACHE_TAG);
  updateTag('search'); // cached search results carry handles in their links
  return { success: true, handle: r.handle };
}
