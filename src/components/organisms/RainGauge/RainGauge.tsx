/**
 * RainGauge (pluviómetro): the HUD of the perpetual record.
 *
 * A thin gauge on the page edge that fills as you read down: how much of the
 * page's rain you have taken in. Driven entirely by CSS scroll timelines
 * (zero JS, zero layout work); browsers without them just show the scale.
 */
import styles from './RainGauge.module.scss';

const TICKS = 21;

export function RainGauge() {
  return (
    <div className={styles.gauge} aria-hidden="true">
      <span className={styles.label}>pluviómetro</span>
      <div className={styles.track}>
        <div className={styles.fill} />
        {Array.from({ length: TICKS }, (_, i) => (
          <span key={i} className={i % 5 === 0 ? styles.tickMajor : styles.tick} style={{ top: `${(i / (TICKS - 1)) * 100}%` }} />
        ))}
      </div>
      <span className={styles.readout}>
        <span className={styles.mm} />
        <span className={styles.unit}>mm</span>
      </span>
    </div>
  );
}
