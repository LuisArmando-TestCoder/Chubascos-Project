'use client';
import { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './QrModal.module.scss';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  label?: string;
}

export function QrModal({ isOpen, onClose, url, label }: QrModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Código QR"
        >
          <motion.div
            ref={dialogRef}
            className={styles.modal}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {label && <p className={styles.label}>{label}</p>}
            <div className={styles.qr}>
              <QRCodeSVG
                value={url}
                size={200}
                fgColor="#ffffff"
                bgColor="transparent"
              />
            </div>
            <p className={styles.url}>{url}</p>
            <button className={styles.close} onClick={onClose} aria-label="Cerrar">
              Cerrar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
