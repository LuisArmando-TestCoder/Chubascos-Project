'use client';
import { useState } from 'react';
import { QrModal } from '@/components/organisms/QrModal/QrModal';
import styles from './QrModalButton.module.scss';

interface QrModalButtonProps {
  url: string;
  label?: string;
}

export function QrModalButton({ url, label }: QrModalButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className={styles.btn}
        onClick={() => setOpen(true)}
        aria-label="Ver código QR"
      >
        QR
      </button>
      <QrModal isOpen={open} onClose={() => setOpen(false)} url={url} label={label} />
    </>
  );
}
