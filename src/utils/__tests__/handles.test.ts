import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bookPath, handleBase, handleProblem, isValidHandle, normalizeHandle, poemPath, profilePath, publicName,
} from '../../lib/handles';

test('handles are seeded from names, never from emails', () => {
  assert.equal(handleBase('María José_Lluvia'), 'maria-jose-lluvia');
  assert.equal(handleBase('luna.lluvia'), 'luna-lluvia');
  assert.equal(handleBase('Yo'), '');          // too short → random seed
  assert.equal(handleBase('¿?'), '');
  assert.equal(handleBase(undefined), '');
  assert.equal(handleBase('panel'), '');       // reserved
  assert.equal(handleBase('x'.repeat(40)).length, 30);
});

test('typed handles are normalized and validated', () => {
  assert.equal(normalizeHandle('  Luna Lluvia  '), 'luna-lluvia-');
  assert.equal(normalizeHandle('a@b.com'), 'ab-com');
  assert.ok(isValidHandle('luna-lluvia'));
  assert.ok(!isValidHandle('-luna'));
  assert.ok(!isValidHandle('luna-'));
  assert.ok(!isValidHandle('lu--na'));
  assert.ok(!isValidHandle('dashboard'));
  assert.ok(!isValidHandle('ab'));
  assert.ok(!isValidHandle('luna@lluvia.cr'));
  assert.equal(handleProblem('ok-handle'), null);
  assert.match(handleProblem('ab')!, /3/);
});

test('links prefer the handle and never need the email', () => {
  const post = { userId: 'luna@lluvia.cr', authorHandle: 'luna', slug: 'charco' };
  assert.equal(profilePath(post), '/u/luna');
  assert.equal(poemPath(post, 'charco'), '/u/luna/p/charco');
  assert.equal(bookPath({ handle: 'luna', id: 'luna@lluvia.cr' }, 'libro'), '/u/luna/b/libro');
  assert.equal(profilePath({ ownerUserId: 'x@y.z', authorHandle: 'equis' }), '/u/equis');
  // Legacy fallback still resolves (and the page redirects it to the handle).
  assert.equal(profilePath({ userId: 'luna@lluvia.cr' }), '/u/luna%40lluvia.cr');
});

test('public names fall back to the handle', () => {
  assert.equal(publicName({ username: 'Luna', handle: 'luna' }), 'Luna');
  assert.equal(publicName({ handle: 'luna-a1b2c' }), 'luna-a1b2c');
  assert.equal(publicName(null), 'poeta');
});
