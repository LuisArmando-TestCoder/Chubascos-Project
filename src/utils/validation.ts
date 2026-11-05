import { z } from 'zod';
import { isSupportedCron } from './cronUtils';
import { isTimeString, isValidTimeZone } from './eventTime';

const SLUG_RE = /^[a-z0-9-]+$/;

/** Links people will click: web pages, email, phone. Never `javascript:`. */
export function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol);
  } catch {
    return false;
  }
}

const safeUrl = z.string().trim().max(500).refine(isSafeUrl, 'Enlace no válido (usa https://, mailto: o tel:).');
const tagIds = (max: number) => z.array(z.string().min(1).max(128)).max(max);

export const PostSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().min(1).max(50000).refine((s) => s.trim().length > 0, 'El poema está vacío.'),
  // Optional: the server derives a unique slug from the title when absent.
  slug: z.string().trim().min(3).max(100).regex(SLUG_RE).optional(),
  tagIds: tagIds(4),
  // `null` removes the poem's shader on update.
  shaderId: z.string().min(1).max(128).nullable().optional(),
  eventId: z.string().max(128).optional(),
  isVisible: z.boolean().default(true),
  isIndexed: z.boolean().default(true),
});

export const USERNAME_RE = /^[\p{L}\p{N}_.-]+$/u;

export const UserSchema = z.object({
  username: z.string().trim().min(3).max(32).regex(USERNAME_RE).optional(),
  bio: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
  contacts: z.array(z.object({
    label: z.string().trim().min(1).max(50),
    url: safeUrl,
  })).max(5),
});

/** What the studio's profile panel may change. */
export const ProfileUpdateSchema = z.object({
  username: z.string().trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres.')
    .max(32, 'El nombre puede tener hasta 32 caracteres.')
    .regex(USERNAME_RE, 'Usa letras, números, punto, guion o guion bajo, sin espacios.')
    .optional(),
  bio: z.string().max(500, 'Biografía muy larga (máx 500).').optional(),
  contacts: z.array(z.object({
    label: z.string().trim().min(1, 'Cada enlace necesita un nombre.').max(50),
    url: safeUrl,
  })).max(5, 'Máximo 5 enlaces.').optional(),
  tagIds: tagIds(10).optional(),
});

/** Field rules without cross-field checks: `.partial()` for updates. */
export const EventBaseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000),
  day: z.coerce.date().refine((d) => !Number.isNaN(d.getTime()), 'Fecha no válida.'),
  hour: z.string().min(1).max(50).refine(isTimeString, 'Hora no válida (HH:MM).'),
  place: z.string().trim().min(1).max(200),
  price: z.number().finite().nonnegative().max(100_000_000).optional(),
  urls: z.array(safeUrl).max(5),
  contacts: z.array(z.string().trim().min(1).max(100)).max(5),
  tagIds: tagIds(4),
  isRecurring: z.boolean().optional(),
  cronExpression: z.string().max(200).refine(isSupportedCron, 'Programación no válida.').optional(),
  timeZone: z.string().max(64).refine(isValidTimeZone, 'Zona horaria no válida.').optional(),
});

export const EventSchema = EventBaseSchema.refine((e) => !e.isRecurring || Boolean(e.cronExpression), {
  message: 'Un evento recurrente necesita una programación.',
  path: ['cronExpression'],
});

export const ShaderSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional(),
  glslCode: z.string().min(1).max(50000),
  isPublic: z.boolean().default(false),
});

export const BookSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().min(1).max(50000).refine((s) => s.trim().length > 0, 'La descripción está vacía.'),
  slug: z.string().trim().min(3).max(100).regex(SLUG_RE).optional(),
  tagIds: tagIds(4).optional(),
  isVisible: z.boolean().default(true),
});

/** First human-readable message from a zod failure. */
export function firstIssue(error: unknown, fallback: string): string {
  if (error instanceof z.ZodError) return error.issues[0]?.message || fallback;
  return fallback;
}
