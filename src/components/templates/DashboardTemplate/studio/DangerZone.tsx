'use client';
import { useState } from 'react';
import styles from './Studio.module.scss';

interface DangerZoneProps {
  label: string;
  onConfirm: () => Promise<void> | void;
}

/** Two clicks to delete: never one. */
export function DangerZone({ label, onConfirm }: DangerZoneProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); setConfirming(false); }
  };
  return (
    <div className={styles.dangerZone}>
      {!confirming ? (
        <button className={styles.dangerTrigger} type="button" onClick={() => setConfirming(true)}>{label}</button>
      ) : (
        <div className={styles.dangerConfirm} role="group" aria-label="Confirmar eliminación">
          <span className={styles.dangerWarning}>¿Eliminar para siempre? No se puede deshacer.</span>
          <button className={styles.dangerConfirmBtn} type="button" onClick={run} disabled={busy} autoFocus>
            {busy ? 'Eliminando…' : 'Sí, eliminar'}
          </button>
          <button className={styles.dangerCancelBtn} type="button" onClick={() => setConfirming(false)} disabled={busy}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
