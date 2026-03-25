'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { UserCard } from '@/components/molecules/UserCard/UserCard';
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
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} id="users-heading">Voces</h2>
        </header>
        <div className={styles.usersGrid}>
          {users.map((user, i) => (
            <motion.div
              key={user.id}
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.25, 1, 0.5, 1] }}
              viewport={{ once: true }}
            >
              <UserCard user={user} />
            </motion.div>
          ))}
        </div>
        <div className={styles.sectionCta}>
          <Link href="/buscar?type=users" className={styles.ctaBtn}>
            Ver todos los poetas
          </Link>
        </div>
      </div>
    </section>
  );
}
