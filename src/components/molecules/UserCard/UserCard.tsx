import Link from 'next/link';
import type { User } from '@/types';
import styles from './UserCard.module.scss';

interface UserCardProps {
  user: User;
  badge?: string;
}

export function UserCard({ user, badge }: UserCardProps) {
  const name = user.username || user.email.split('@')[0];
  return (
    <article className={styles.card}>
      {badge && <span className={styles.badge}>{badge}</span>}
      <Link href={`/u/${user.id}`} className={styles.inner}>
        <div className={styles.avatar} aria-hidden="true">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className={styles.info}>
          <h3 className={styles.name}>{name}</h3>
          {user.bio && <p className={styles.bio}>{user.bio.slice(0, 80)}{user.bio.length > 80 ? '…' : ''}</p>}
        </div>
      </Link>
    </article>
  );
}
