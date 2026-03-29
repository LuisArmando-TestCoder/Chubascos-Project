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


  // List of all items flattened for rendering
  const normsItems = [
    { text: i18n.norms.items.respect, href: "/normas" },
    { text: i18n.norms.items.authentic, href: "/normas" },
    { text: i18n.norms.items.consent, href: "/normas" },
    { text: i18n.norms.items.goodFaith, href: "/normas" }
  ];

  const rightsItems = [
    { text: i18n.norms.items.ownership, href: "/privacidad" },
    { text: i18n.norms.items.noSell, href: "/privacidad" },
    { text: i18n.norms.items.privacy, href: "/privacidad" },
    { text: i18n.norms.items.delete, href: "/privacidad" }
  ];

  return (
    <main className={styles.container}>
      <motion.div 
        className={styles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={styles.authSection}>
          <header className={styles.header}>
            <h1 className={styles.title}>Entrar a Chubascos</h1>
            <p className={styles.subtitle}>
              {step === 'email' ? 'Introduce tu email para recibir un código de acceso.' : `Enviamos un código a ${email}`}
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
                  className={styles.inputWrapper}
                >
                  <input
                    className={styles.input}
                    type="email"
                    placeholder="tu@email.com"
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
                  className={styles.inputWrapper}
                >
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Código de 6 dígitos"
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
              {loading ? 'Cargando...' : (step === 'email' ? 'Enviar código' : 'Verificar')}
            </button>
          </form>

          {step === 'otp' && (
            <button className={styles.back} type="button" onClick={() => setStep('email')}>
              Usar otro correo
            </button>
          )}
        </div>

        <div className={styles.normsSection}>
          <div className={styles.normsContent}>
            <div className={styles.normsGroup}>
              <h2 className={styles.normsTitle}>{i18n.norms.communityTitle}</h2>
              <ul className={styles.normsList}>
                {normsItems.map((item, index) => (
                  <li key={index}>
                    <a href={item.href} target="_blank" rel="noopener noreferrer">{item.text}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.normsGroup}>
              <h2 className={styles.normsTitle}>{i18n.norms.rightsTitle}</h2>
              <ul className={styles.normsList}>
                {rightsItems.map((item, index) => {
                  const globalIndex = index + normsItems.length;
                  return (
                    <li key={globalIndex}>
                      <a href={item.href} target="_blank" rel="noopener noreferrer">{item.text}</a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
