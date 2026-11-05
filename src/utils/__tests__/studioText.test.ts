import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flagsFor, normalizeLink, poemStats, visibilityOf } from '../../components/templates/DashboardTemplate/studio/text';
import { isSafeUrl, PostSchema, EventSchema, ProfileUpdateSchema } from '../validation';

test('visibility round-trips through the stored flags', () => {
  for (const v of ['public', 'quiet', 'hidden'] as const) assert.equal(visibilityOf(flagsFor(v)), v);
  assert.equal(visibilityOf(null), 'public');
  assert.equal(visibilityOf({ isVisible: true }), 'public'); // legacy docs without isIndexed
});

test('poem stats count verses, stanzas and words', () => {
  const s = poemStats('Llueve\nsobre el techo\n\n  \nY yo\r\nescucho');
  assert.equal(s.verses, 4);
  assert.equal(s.stanzas, 2);
  assert.equal(s.words, 7);
  assert.equal(poemStats('').readingLabel, '—');
});

test('links get a safe scheme', () => {
  assert.equal(normalizeLink('instagram.com/poeta'), 'https://instagram.com/poeta');
  assert.equal(normalizeLink('yo@lluvia.cr'), 'mailto:yo@lluvia.cr');
  assert.equal(normalizeLink('+506 8888-8888'), 'tel:+50688888888');
  assert.equal(normalizeLink('https://x.com'), 'https://x.com');
  assert.ok(!isSafeUrl('javascript:alert(1)'));
  assert.ok(!isSafeUrl(normalizeLink('javascript:alert(1)')));
  assert.ok(isSafeUrl('https://chubascos.cr'));
});

test('post schema: slug optional, whitespace-only poems rejected, null shader allowed', () => {
  assert.ok(PostSchema.safeParse({ title: 'Yo', content: 'verso', tagIds: [] }).success);
  assert.ok(!PostSchema.safeParse({ title: 'Yo', content: '   \n ', tagIds: [] }).success);
  assert.ok(PostSchema.partial().safeParse({ shaderId: null }).success);
  assert.ok(!PostSchema.safeParse({ title: 'x', content: 'y', tagIds: ['a', 'b', 'c', 'd', 'e'] }).success);
});

test('event schema guards time, zone, recurrence and links', () => {
  const base = { title: 'Noche', description: '', day: new Date(), hour: '19:00', place: 'Café', urls: [], contacts: [], tagIds: [] };
  assert.ok(EventSchema.safeParse({ ...base, timeZone: 'America/Costa_Rica' }).success);
  assert.ok(!EventSchema.safeParse({ ...base, hour: '7pm' }).success);
  assert.ok(!EventSchema.safeParse({ ...base, timeZone: 'Nowhere/Land' }).success);
  assert.ok(!EventSchema.safeParse({ ...base, isRecurring: true }).success);
  assert.ok(!EventSchema.safeParse({ ...base, isRecurring: true, cronExpression: '* * * * *' }).success);
  assert.ok(EventSchema.safeParse({ ...base, isRecurring: true, cronExpression: '0 19 * * 6' }).success);
  assert.ok(!EventSchema.safeParse({ ...base, urls: ['javascript:alert(1)'] }).success);
  assert.ok(!EventSchema.safeParse({ ...base, price: -1 }).success);
});

test('profile schema: username format and safe contacts', () => {
  assert.ok(ProfileUpdateSchema.safeParse({ username: 'María_lluvia' }).success);
  assert.ok(!ProfileUpdateSchema.safeParse({ username: 'con espacio' }).success);
  assert.ok(!ProfileUpdateSchema.safeParse({ username: 'yo' }).success);
  assert.ok(!ProfileUpdateSchema.safeParse({ contacts: [{ label: 'x', url: 'javascript:alert(1)' }] }).success);
  assert.ok(ProfileUpdateSchema.safeParse({ contacts: [{ label: 'IG', url: 'https://instagram.com/x' }] }).success);
});

test('pdf text keeps Spanish and typographic marks, drops unprintable glyphs', async () => {
  const { toPrintable } = await import('../pdfBook/generateBook');
  assert.equal(toPrintable('¿Lluvia? ¡Sí! — “ñ” …'), '¿Lluvia? ¡Sí! — “ñ” …');
  assert.equal(toPrintable('agua 🌧️ y 雨'), 'agua y ');
  assert.equal(toPrintable('uno\ndos'), 'uno\ndos');
});
