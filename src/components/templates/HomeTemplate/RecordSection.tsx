import { SectionHeader } from '@/components/molecules/SectionHeader/SectionHeader';
import { Pluviograma } from '@/components/organisms/Pluviograma/Pluviograma';
import type { Post } from '@/types';
import styles from './HomeTemplate.module.scss';

interface RecordSectionProps {
  posts: Post[];
}

/** The opening of the record: what has fallen lately, laid out in time. */
export function RecordSection({ posts }: RecordSectionProps) {
  if (posts.length < 2) return null;
  return (
    <section className={`${styles.section} ${styles.record}`} aria-labelledby="record-heading">
      <div className={styles.sectionInner}>
        <SectionHeader
          id="record-heading"
          index={1}
          total={4}
          kicker="Registro perpetuo"
          title="Todo lo que llovió"
          echo="registro"
        />
        <Pluviograma posts={posts} />
      </div>
    </section>
  );
}
