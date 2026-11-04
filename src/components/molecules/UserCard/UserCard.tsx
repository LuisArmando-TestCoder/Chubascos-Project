import Link from 'next/link';
import { DropSigil } from '@/components/atoms/DropSigil/DropSigil';
import type { User } from '@/types';
import styles from './UserCard.module.scss';

interface UserCardProps {
  user: User;
  badge?: string;
}

export function UserCard({ user, badge }: UserCardProps) {
  const name = user.username || user.email.split('@')[0];
  return (
    <article className={styles.card} data-drop="paper">
      {badge && <span className={styles.badge}>{badge}</span>}
      <div className={styles.avatar} aria-hidden="true">
        <DropSigil name={name} size="100%" glyph={name.slice(0, 1).toUpperCase()} />
      </div>
      <div className={styles.info}>
        <h3 className={styles.name}>
          <Link href={`/u/${user.id}`} className={styles.inner}>{name}</Link>
        </h3>
        {user.bio && <p className={styles.bio}>{user.bio.slice(0, 90)}{user.bio.length > 90 ? '…' : ''}</p>}
      </div>
    </article>
  );
}
