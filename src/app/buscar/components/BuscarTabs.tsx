import React, { useRef } from 'react';
import styles from '../buscar.module.scss';
import i18n from '@/utils/i18n';

export type TabType = 'posts' | 'events' | 'users' | 'books';

interface BuscarTabsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  counts: Record<TabType, number>;
  showCounts: boolean;
}

const TABS: TabType[] = ['posts', 'events', 'books', 'users'];
const LABEL: Record<TabType, string> = {
  posts: i18n.common.poems,
  events: i18n.common.events,
  books: 'Libros',
  users: i18n.common.poets,
};

/** WAI-ARIA tabs: arrows move, Home/End jump, roving tabindex. */
export function BuscarTabs({ activeTab, setActiveTab, counts, showCounts }: BuscarTabsProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = TABS.indexOf(activeTab);
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length;
    if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = TABS.length - 1;
    if (next === null) return;
    e.preventDefault();
    setActiveTab(TABS[next]);
    refs.current[TABS[next]]?.focus();
  };

  return (
    <div className={styles.tabs} role="tablist" aria-label="Tipo de resultado" onKeyDown={onKeyDown}>
      {TABS.map((tab) => {
        const selected = activeTab === tab;
        return (
          <button
            key={tab}
            ref={(el) => { refs.current[tab] = el; }}
            id={`tab-${tab}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls="buscar-panel"
            tabIndex={selected ? 0 : -1}
            className={`${styles.tab} ${selected ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {LABEL[tab]}
            {showCounts && <span className={styles.tabCount}>{counts[tab]}</span>}
          </button>
        );
      })}
    </div>
  );
}
