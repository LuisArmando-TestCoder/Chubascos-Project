/**
 * Kindred voices: who writes like whom, read from the tags on their work.
 *
 * Every author becomes a weighted profile over the tag taxonomy:
 *
 * 1. Each poem or book spreads one unit of weight over its tags, so a work
 *    with ten tags does not shout louder than one with two.
 * 2. Each tag also lends weight up its branch (½ to the parent, ¼ to the
 *    grandparent…), so "Desamor" and "Mutual pining" meet at "Amor" even when
 *    no single tag is shared. Roots are navigation only and are skipped.
 * 3. The profile is averaged over the author's works: it describes what they
 *    usually write, not how much.
 * 4. Tags everybody uses say little about anyone, so each dimension is scaled
 *    by its rarity across authors (IDF).
 *
 * Affinity is the cosine between two profiles. The explanation is the handful
 * of tags contributing most to it, without listing a tag and its own ancestor.
 */
import { TAXON_INDEX } from '@/data/tagTaxonomy';
import type { Tag } from '@/types';

export type AuthorInput = {
  id: string;
  name: string;
  /** Tag ids of each visible poem or book. */
  works: string[][];
  /** Tags the author chose for their own profile. */
  selfTags?: string[];
};

export type SharedTag = { slug: string; label: string; tagId?: string };
export type Kindred = { id: string; name: string; score: number; shared: SharedTag[] };

const ANCESTOR_DECAY = 0.5;
const SELF_TAG_WEIGHT = 0.5;
export const MIN_AFFINITY = 0.12;
export const MAX_KINDRED = 6;
const MAX_SHARED = 3;

type Vec = Map<string, number>;

/** Dimension key + weight for a tag and every ancestor below the root. */
function spread(slug: string | undefined, tagId: string): [string, number][] {
  const canonical = slug ? TAXON_INDEX.canonical.get(slug) : undefined;
  // Tags outside the tree still count, just without a branch to climb.
  if (!canonical) return [[slug ? `s:${slug}` : `id:${tagId}`, 1]];
  const out: [string, number][] = [];
  let cur: string | null | undefined = canonical;
  let w = 1;
  while (cur) {
    const node = TAXON_INDEX.bySlug.get(cur);
    if (!node || node.root) break;
    out.push([cur, w]);
    w *= ANCESTOR_DECAY;
    cur = TAXON_INDEX.parentOf.get(cur);
  }
  return out;
}

function addWork(vec: Vec, tagIds: string[], slugOf: Map<string, string>, scale: number) {
  const ids = [...new Set(tagIds)].filter(Boolean);
  if (ids.length === 0) return;
  const share = scale / ids.length;
  for (const id of ids) {
    for (const [dim, w] of spread(slugOf.get(id), id)) vec.set(dim, (vec.get(dim) || 0) + share * w);
  }
}

function isAncestor(a: string, b: string): boolean {
  let cur = TAXON_INDEX.parentOf.get(b);
  while (cur) {
    if (cur === a) return true;
    cur = TAXON_INDEX.parentOf.get(cur);
  }
  return false;
}

export function computeAffinities(authors: AuthorInput[], tags: Tag[]): Record<string, Kindred[]> {
  const slugOf = new Map(tags.map((t) => [t.id, t.slug]));
  const idOfSlug = new Map(tags.map((t) => [t.slug, t.id]));
  const valueOfSlug = new Map(tags.map((t) => [t.slug, t.value]));

  // 1–3: averaged profiles.
  const profiles = new Map<string, Vec>();
  for (const a of authors) {
    const vec: Vec = new Map();
    const tagged = a.works.filter((w) => w.length > 0);
    tagged.forEach((w) => addWork(vec, w, slugOf, 1 / tagged.length));
    if (a.selfTags?.length) addWork(vec, a.selfTags, slugOf, SELF_TAG_WEIGHT);
    if (vec.size > 0) profiles.set(a.id, vec);
  }

  // 4: rarity.
  const n = profiles.size;
  const df = new Map<string, number>();
  profiles.forEach((v) => v.forEach((_, d) => df.set(d, (df.get(d) || 0) + 1)));
  const norms = new Map<string, number>();
  profiles.forEach((v, id) => {
    let sum = 0;
    v.forEach((x, d) => {
      const y = x * Math.log(1 + n / (df.get(d) || 1));
      v.set(d, y);
      sum += y * y;
    });
    norms.set(id, Math.sqrt(sum));
  });

  const names = new Map(authors.map((a) => [a.id, a.name]));
  const labelOf = (dim: string): SharedTag => {
    const slug = dim.startsWith('s:') ? dim.slice(2) : dim;
    const node = TAXON_INDEX.bySlug.get(slug);
    return { slug, label: node?.label || valueOfSlug.get(slug) || slug, tagId: idOfSlug.get(slug) };
  };

  const ids = [...profiles.keys()];
  const result: Record<string, Kindred[]> = {};
  for (const id of ids) result[id] = [];

  for (let i = 0; i < ids.length; i++) {
    const a = profiles.get(ids[i])!;
    for (let j = i + 1; j < ids.length; j++) {
      const b = profiles.get(ids[j])!;
      const [small, large] = a.size < b.size ? [a, b] : [b, a];
      const parts: [string, number][] = [];
      let dot = 0;
      small.forEach((x, d) => {
        const y = large.get(d);
        if (y) {
          dot += x * y;
          parts.push([d, x * y]);
        }
      });
      if (dot === 0) continue;
      const score = dot / (norms.get(ids[i])! * norms.get(ids[j])!);
      if (score < MIN_AFFINITY) continue;

      parts.sort((p, q) => q[1] - p[1]);
      const chosen: string[] = [];
      for (const [d] of parts) {
        if (chosen.some((c) => c === d || isAncestor(c, d) || isAncestor(d, c))) continue;
        chosen.push(d);
        if (chosen.length === MAX_SHARED) break;
      }
      const shared = chosen.map(labelOf);
      result[ids[i]].push({ id: ids[j], name: names.get(ids[j]) || 'poeta', score, shared });
      result[ids[j]].push({ id: ids[i], name: names.get(ids[i]) || 'poeta', score, shared });
    }
  }

  for (const id of ids) {
    result[id] = result[id].sort((p, q) => q.score - p.score).slice(0, MAX_KINDRED);
    if (result[id].length === 0) delete result[id];
  }
  return result;
}
