'use client';
/**
 * TagExplorer: fall through the taxonomy, one level per column, from the
 * hyper-general (Forma, Tema, Ánimo…) down to very specific internet tropes.
 *
 * - `browse`: choosing a tag opens its branch and reports it (search page).
 * - `pick`: a drop beside each tag toggles it, up to `max` (studio forms).
 * Keyboard: ↑/↓ within a column, → opens a branch, ← goes back up.
 */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { pathTo, TAXON_INDEX, type TaxonNode } from '@/data/tagTaxonomy';
import type { Tag } from '@/types';
import { useTaxonomy } from './useTaxonomy';
import styles from './TagExplorer.module.scss';

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface BaseProps {
  tags: Tag[];
  /** Accessible name of the whole explorer. */
  label: string;
  className?: string;
}
interface BrowseProps extends BaseProps {
  mode: 'browse';
  activeTagId?: string;
  loading?: boolean;
  onSelect: (tag: Tag, origin: Element) => void;
}
interface PickProps extends BaseProps {
  mode: 'pick';
  selectedIds: string[];
  max: number;
  onToggle: (tagId: string) => void;
}
type TagExplorerProps = BrowseProps | PickProps;

export function TagExplorer(props: TagExplorerProps) {
  const { tags, label, className = '' } = props;
  const tax = useTaxonomy(tags);
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  // The open branch, as slugs from root to the deepest open node.
  const initialPath = useMemo(() => {
    if (props.mode !== 'browse' || !props.activeTagId) return [] as string[];
    const tag = tagById.get(props.activeTagId);
    return tag ? pathTo(tag.slug).map((n) => n.slug) : [];
    // only on mount: later the user drives the path
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [openPath, setOpenPath] = useState<string[]>(initialPath);
  const [filter, setFilter] = useState('');
  const columnsRef = useRef<HTMLDivElement>(null);
  const filterId = useId();

  // Follow external changes (e.g. a breadcrumb chose another tag).
  const activeTagId = props.mode === 'browse' ? props.activeTagId : undefined;
  useEffect(() => {
    if (!activeTagId) return;
    const tag = tagById.get(activeTagId);
    if (!tag) return;
    const path = pathTo(tag.slug).map((n) => n.slug);
    // Open the active tag's branch unless the user is already looking inside it.
    setOpenPath((cur) => (path.every((slug, i) => cur[i] === slug) ? cur : path));
  }, [activeTagId, tagById]);

  // Columns: roots, then the children of every open node that has children.
  const columns = useMemo(() => {
    const cols: { parent: TaxonNode | null; nodes: TaxonNode[] }[] = [{ parent: null, nodes: tax.roots }];
    for (const slug of openPath) {
      const node = TAXON_INDEX.bySlug.get(slug);
      if (node && node.children.length) cols.push({ parent: node, nodes: node.children });
    }
    return cols;
  }, [openPath, tax.roots]);

  // Keep the newest column in view (horizontal scroller on small screens).
  useEffect(() => {
    const el = columnsRef.current;
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
  }, [columns.length]);

  const openNode = (node: TaxonNode, depth: number) => {
    setOpenPath((cur) => [...cur.slice(0, depth), node.slug]);
  };

  const selectedSet = props.mode === 'pick' ? new Set(props.selectedIds) : null;
  const atMax = props.mode === 'pick' && props.selectedIds.length >= props.max;
  const selectedInBranch = (node: TaxonNode) => {
    if (!selectedSet || selectedSet.size === 0) return 0;
    let n = 0;
    const walk = (x: TaxonNode) => {
      const t = tax.tagBySlug.get(x.slug);
      if (t && selectedSet.has(t.id)) n++;
      x.children.forEach(walk);
    };
    walk(node);
    return n;
  };

  const onItem = (node: TaxonNode, depth: number, el: Element) => {
    const tag = tax.tagBySlug.get(node.slug);
    if (node.children.length) openNode(node, depth);
    else setOpenPath((cur) => [...cur.slice(0, depth), node.slug]);
    if (props.mode === 'browse' && tag && !node.root) props.onSelect(tag, el);
    if (props.mode === 'pick' && tag && !node.children.length && (!atMax || selectedSet?.has(tag.id))) props.onToggle(tag.id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, node: TaxonNode, depth: number) => {
    const li = e.currentTarget.closest('li');
    const focusIn = (target: Element | null | undefined) => (target?.querySelector('[data-item]') as HTMLElement | null)?.focus();
    if (e.key === 'ArrowDown') { e.preventDefault(); focusIn(li?.nextElementSibling); }
    if (e.key === 'ArrowUp') { e.preventDefault(); focusIn(li?.previousElementSibling); }
    if (e.key === 'ArrowRight' && node.children.length) {
      e.preventDefault();
      openNode(node, depth);
      requestAnimationFrame(() => focusIn(columnsRef.current?.children[depth + 1]?.querySelector('li')));
    }
    if (e.key === 'ArrowLeft' && depth > 0) {
      e.preventDefault();
      const parentSlug = openPath[depth - 1];
      (columnsRef.current?.children[depth - 1]?.querySelector(`[data-slug="${parentSlug}"]`) as HTMLElement | null)?.focus();
    }
  };

  // Flat search across the whole tree (pick mode), each hit with its path.
  const hits = useMemo(() => {
    const q = fold(filter.trim());
    if (q.length < 2) return [];
    return [...TAXON_INDEX.bySlug.values()]
      .filter((n) => !n.root && (fold(n.label).includes(q) || (n.gloss && fold(n.gloss).includes(q))))
      .slice(0, 24);
  }, [filter]);

  const breadcrumb = openPath.map((s) => TAXON_INDEX.bySlug.get(s)).filter(Boolean) as TaxonNode[];

  const renderToggle = (node: TaxonNode) => {
    if (props.mode !== 'pick' || node.root) return null;
    const tag = tax.tagBySlug.get(node.slug);
    if (!tag) return null;
    const on = selectedSet!.has(tag.id);
    return (
      <button
        type="button"
        className={`${styles.toggle} ${on ? styles.toggleOn : ''}`}
        aria-pressed={on}
        aria-label={`${on ? 'Quitar' : 'Elegir'} ${node.label}`}
        disabled={!on && atMax}
        onClick={() => props.onToggle(tag.id)}
      />
    );
  };

  return (
    <div className={`${styles.explorer} ${className}`} role="group" aria-label={label}>
      <div className={styles.top}>
        <nav className={styles.breadcrumb} aria-label="Ruta en la taxonomía">
          <button type="button" className={styles.crumb} onClick={() => setOpenPath([])}>Todo</button>
          {breadcrumb.map((n, i) => (
            <span key={n.slug} className={styles.crumbWrap}>
              <span className={styles.crumbSep} aria-hidden="true">›</span>
              <button
                type="button"
                className={styles.crumb}
                aria-current={i === breadcrumb.length - 1 ? 'location' : undefined}
                onClick={() => setOpenPath(openPath.slice(0, i + 1))}
              >
                {n.label}
              </button>
            </span>
          ))}
        </nav>

        {props.mode === 'pick' && (
          <div className={styles.pickBar}>
            <span className={styles.pickCount}>{props.selectedIds.length}/{props.max}</span>
            <label className="visually-hidden" htmlFor={filterId}>Buscar etiqueta</label>
            <input
              id={filterId}
              className={styles.filter}
              type="search"
              placeholder="Buscar etiqueta…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              autoComplete="off"
            />
          </div>
        )}
      </div>

      {props.mode === 'pick' && props.selectedIds.length > 0 && (
        <ul className={styles.chips} aria-label="Etiquetas elegidas">
          {props.selectedIds.map((id) => {
            const tag = tagById.get(id);
            if (!tag) return null;
            return (
              <li key={id}>
                <button type="button" className={styles.chip} onClick={() => props.onToggle(id)} aria-label={`Quitar ${tag.value}`}>
                  #{tag.value} <span aria-hidden="true">×</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {hits.length > 0 ? (
        <ul className={styles.hits} aria-label="Resultados">
          {hits.map((n) => (
            <li key={n.slug} className={styles.hit}>
              {renderToggle(n)}
              <button
                type="button"
                className={styles.hitLabel}
                onClick={() => { setOpenPath(pathTo(n.slug).map((x) => x.slug)); setFilter(''); }}
              >
                <span className={styles.hitName}>{n.label}</span>
                <span className={styles.hitPath}>{pathTo(n.slug).slice(0, -1).map((x) => x.label).join(' › ')}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div ref={columnsRef} className={styles.columns}>
          {columns.map((col, depth) => (
            <div key={col.parent?.slug ?? 'raices'} className={styles.column} style={{ ['--depth' as string]: depth }}>
              <p className={styles.colHead}>{col.parent ? col.parent.gloss ?? col.parent.label : 'Siete maneras de entrar'}</p>
              <ul className={styles.list}>
                {col.nodes.map((node) => {
                  const tag = tax.tagBySlug.get(node.slug);
                  const isOpen = openPath[depth] === node.slug;
                  const isActive = props.mode === 'browse' && !!tag && tag.id === props.activeTagId;
                  const usage = tax.branchUsage.get(node.slug) ?? 0;
                  const picked = props.mode === 'pick' ? selectedInBranch(node) : 0;
                  return (
                    <li key={node.slug} className={styles.row}>
                      {renderToggle(node)}
                      <button
                        type="button"
                        data-item
                        data-slug={node.slug}
                        className={`${styles.item} ${isOpen ? styles.open : ''} ${isActive ? styles.active : ''} ${node.root ? styles.rootItem : ''} ${usage === 0 && props.mode === 'browse' ? styles.dry : ''}`}
                        aria-expanded={node.children.length ? isOpen : undefined}
                        aria-pressed={props.mode === 'browse' && !node.root ? isActive : undefined}
                        onClick={(e) => onItem(node, depth, e.currentTarget)}
                        onKeyDown={(e) => onKeyDown(e, node, depth)}
                      >
                        <span className={styles.itemText}>
                          <span className={styles.itemLabel}>{node.label}</span>
                          {(node.root || (node.gloss && depth > 0)) && node.gloss && (
                            <span className={styles.itemGloss}>{node.gloss}</span>
                          )}
                        </span>
                        <span className={styles.itemMeta}>
                          {props.mode === 'browse' && usage > 0 && <span className={styles.count}>{usage}</span>}
                          {props.mode === 'browse' && isActive && props.loading && <span className={styles.spinner} aria-hidden="true" />}
                          {picked > 0 && node.children.length > 0 && <span className={styles.pickedDot} aria-label={`${picked} elegidas dentro`}>{picked}</span>}
                          {node.children.length > 0 && <span className={styles.chevron} aria-hidden="true">›</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
