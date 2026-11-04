import Link from 'next/link';
import { UserCard } from '@/components/molecules/UserCard/UserCard';
import { SectionHeader } from '@/components/molecules/SectionHeader/SectionHeader';
import i18n from '@/utils/i18n';
import type { User } from '@/types';
import styles from './HomeTemplate.module.scss';

interface UsersSectionProps {
  users: User[];
}

export function UsersSection({ users }: UsersSectionProps) {
  if (users.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="users-heading">
      <div className={styles.sectionInner}>
        <SectionHeader
          id="users-heading"
          title={i18n.home.poets.title}
          echo="voces"
        />
        <ul className={styles.usersGrid}>
          {users.map((user) => (
            <li key={user.id}>
              <UserCard user={user} />
            </li>
          ))}
        </ul>
        <div className={styles.sectionCta}>
          <Link href="/buscar?type=users" className={styles.ctaBtn}>
            {i18n.common.seeMore}
          </Link>
        </div>
      </div>
    </section>
  );
}
