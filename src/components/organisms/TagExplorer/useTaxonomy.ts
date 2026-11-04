import { useMemo } from 'react';
import { TAXONOMY, TAXON_INDEX, type TaxonNode } from '@/data/tagTaxonomy';
import type { Tag } from '@/types';

const usageOf = (t?: Tag) => (t ? (t.usedByPosts || 0) + (t.usedByEvents || 0) + (t.usedByBooks || 0) : 0);

/** Joins the static tree with live Firestore tags: ids, own usage, branch usage. */
export function useTaxonomy(tags: Tag[]) {
  return useMemo(() => {
    const tagBySlug = new Map(tags.map((t) => [t.slug, t]));
    const branchUsage = new Map<string, number>();
    const walk = (n: TaxonNode): number => {
      const own = n.root ? 0 : usageOf(tagBySlug.get(n.slug)) + (n.aliases ?? []).reduce((s, a) => s + usageOf(tagBySlug.get(a)), 0);
      const total = own + n.children.reduce((s, c) => s + walk(c), 0);
      branchUsage.set(n.slug, total);
      return total;
    };
    TAXONOMY.forEach(walk);
    const nodeForTag = (tag: Tag) => {
      const slug = TAXON_INDEX.canonical.get(tag.slug);
      return slug ? TAXON_INDEX.bySlug.get(slug) : undefined;
    };
    return { roots: TAXONOMY, tagBySlug, branchUsage, nodeForTag };
  }, [tags]);
}
