import React from 'react';
import styles from '../buscar.module.scss';
import i18n from '@/utils/i18n';
import type { Tag, Post, Event, User } from '@/types';

export type TabType = 'posts' | 'events' | 'users';

interface BuscarTabsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  selectedTag: string;
  tags: Tag[];
  tagMap: Record<string, Tag>;
  posts: Post[];
  events: Event[];
  users: User[];
}

export function BuscarTabs({
  activeTab,
  setActiveTab,
  selectedTag,
  tags,
  tagMap,
  posts,
  events,
  users
}: BuscarTabsProps) {
  const tabs: TabType[] = ['posts', 'events', 'users'];

  return (
    <div className={styles.tabs} role="tablist">
      {tabs.map((tab) => {
        let label = tab === 'posts' ? i18n.common.poems : tab === 'events' ? i18n.common.events : i18n.common.poets;
        let count = tab === 'posts' ? posts.length : tab === 'events' ? events.length : users.length;

        if (selectedTag) {
          const tagObj = tags.find(t => t.id === selectedTag) || tagMap[selectedTag];
          if (tagObj) {
            if (tab === 'posts') count = tagObj.usedByPosts ?? posts.length;
            else if (tab === 'events') count = tagObj.usedByEvents ?? events.length;
            else count = users.length;
          }
          label += ` (${count})`;
        }

        return (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
