'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { requestOtp, verifyOtp } from '@/actions/auth';
import i18n from '@/utils/i18n';
import styles from './EntrarTemplate.module.scss';

export default function EntrarTemplate() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await requestOtp(email);
    if (res.success) {
      setStep('otp');
      setMessage('Te hemos enviado un código a tu correo.');
    } else {
      setError(res.error || 'Algo salió mal.');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await verifyOtp(email, otp);
    if (res.success) {
      window.location.href = '/dashboard';
    } else {
      setError(res.error || 'Código incorrecto.');
    }
    setLoading(false);
  };

  return (
    <main className={styles.container}>
      <motion.div 
        className={styles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className={styles.header}>
          <h1 className={styles.title}>{i18n.auth.title}</h1>
          <p className={styles.subtitle}>
            {step === 'email' ? i18n.auth.subtitle : i18n.auth.otpSubtitle.replace('{email}', email)}
          </p>
        </header>

        <form className={styles.form} onSubmit={step === 'email' ? handleRequestOtp : handleVerifyOtp}>
          <AnimatePresence mode="wait">
            {step === 'email' ? (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <input
                  className={styles.input}
                  type="email"
                  placeholder={i18n.auth.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <input
                  className={styles.input}
                  type="text"
                  placeholder={i18n.auth.otpPlaceholder}
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              </motion.div>
            )}
          </AnimatePresence>

          {error && <p className={styles.error}>{error}</p>}
          {message && <p className={styles.message}>{message}</p>}

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? i18n.common.loading : (step === 'email' ? i18n.auth.sendOtp : i18n.auth.verify)}
          </button>
        </form>

        {step === 'otp' && (
          <button className={styles.back} onClick={() => setStep('email')}>
            Usar otro correo
          </button>
        )}
      </motion.div>
    </main>
  );
}
