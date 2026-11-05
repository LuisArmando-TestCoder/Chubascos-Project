// Public handles: the only identity that appears in URLs and on screen.
//
// A handle is seeded once from the poet's name and then stays put: renaming
// yourself never moves your links. Changing it is a deliberate act (with a
// warning), and the old handle is released, like on Instagram.
//
// Pure module: safe on the server and in the browser.

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 30;
export const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/;

/** Route names and words that would read as the site itself. */
export const RESERVED_HANDLES = new Set([
  'admin', 'api', 'app', 'b', 'buscar', 'chubasco', 'chubascos', 'dashboard', 'e', 'entrar', 'equipo',
  'guardados', 'help', 'login', 'logout', 'me', 'normas', 'null', 'p', 'panel', 'perfil', 'poeta',
  'privacidad', 'root', 'salir', 'settings', 'soporte', 'support', 'taller', 'u', 'undefined',
]);

export function isValidHandle(value: unknown): value is string {
  return typeof value === 'string' && HANDLE_RE.test(value) && !value.includes('--') && !RESERVED_HANDLES.has(value);
}

/** What a typed handle becomes: lowercase, accents folded, spaces → hyphens. */
export function normalizeHandle(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s_.]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .slice(0, HANDLE_MAX);
}

/** Seed from a display name. Returns '' when the name gives too little. */
export function handleBase(username: string | undefined | null): string {
  const base = normalizeHandle(username ?? '').replace(/-+$/, '');
  return base.length >= HANDLE_MIN && isValidHandle(base) ? base : '';
}

/** Problem with a handle a poet typed, in Spanish, or null if it's fine. */
export function handleProblem(value: string): string | null {
  if (value.length < HANDLE_MIN) return `Al menos ${HANDLE_MIN} caracteres.`;
  if (value.length > HANDLE_MAX) return `Hasta ${HANDLE_MAX} caracteres.`;
  if (RESERVED_HANDLES.has(value)) return 'Esa dirección está reservada.';
  if (!HANDLE_RE.test(value) || value.includes('--')) return 'Solo minúsculas, números y guiones (sin guion al inicio o al final).';
  return null;
}

type Owner = { handle?: string; authorHandle?: string; id?: string; userId?: string; ownerUserId?: string };

/** The public segment for a poet: their handle, or (legacy) their id. */
export function ownerSegment(owner: Owner | string | null | undefined): string {
  if (!owner) return '';
  if (typeof owner === 'string') return owner;
  return owner.handle || owner.authorHandle || owner.userId || owner.ownerUserId || owner.id || '';
}

export function profilePath(owner: Owner | string | null | undefined): string {
  return `/u/${encodeURIComponent(ownerSegment(owner))}`;
}

export function poemPath(owner: Owner | string | null | undefined, slug: string): string {
  return `${profilePath(owner)}/p/${encodeURIComponent(slug)}`;
}

export function bookPath(owner: Owner | string | null | undefined, slug: string): string {
  return `${profilePath(owner)}/b/${encodeURIComponent(slug)}`;
}

/** The name other people see. Never derived from the email. */
export function publicName(user: { username?: string; handle?: string } | null | undefined): string {
  return user?.username?.trim() || user?.handle || 'poeta';
}
