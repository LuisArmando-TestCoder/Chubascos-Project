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
  const [activeIndex, setActiveIndex] = useState(0);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await requestOtp(email);
    if (res.success) {
      setStep('otp');
      setMessage(i18n.auth.otpSubtitle.replace('{email}', email));
    } else {
      setError(res.error || i18n.common.error);
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
      setError(res.error || i18n.auth.errorInvalidOtp);
    }
    setLoading(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    
    // Dynamic item highlighting logic
    const containerCenterY = target.getBoundingClientRect().top + (target.clientHeight / 2);
    
    // Find all list items inside the scrollable container
    const items = target.querySelectorAll('li');
    let closestIndex = 0;
    let closestDistance = Infinity;

    items.forEach((item, index) => {
      const rect = item.getBoundingClientRect();
      const itemCenterY = rect.top + (rect.height / 2);
      const distance = Math.abs(containerCenterY - itemCenterY);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex(closestIndex);
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
                  className={styles.inputWrapper}
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
                  className={styles.inputWrapper}
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
            <button className={styles.back} type="button" onClick={() => setStep('email')}>
              {i18n.common.back}
            </button>
          )}
        </div>

        <div className={styles.normsSection}>
          <div className={styles.normsContent} onScroll={handleScroll}>
            <div className={styles.normsSpacerTop} />

            <div className={styles.normsGroup}>
              <h2 className={styles.normsTitle}>{i18n.norms.communityTitle}</h2>
              <ul className={styles.normsList}>
                {normsItems.map((item, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <li key={index} className={isActive ? styles.activeItem : styles.dimmedItem}>
                      <a href={item.href} target="_blank" rel="noopener noreferrer">{item.text}</a>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className={styles.normsGroup}>
              <h2 className={styles.normsTitle}>{i18n.norms.rightsTitle}</h2>
              <ul className={styles.normsList}>
                {rightsItems.map((item, index) => {
                  // Offset the index by the number of normsItems
                  const globalIndex = index + normsItems.length;
                  const isActive = globalIndex === activeIndex;
                  return (
                    <li key={globalIndex} className={isActive ? styles.activeItem : styles.dimmedItem}>
                      <a href={item.href} target="_blank" rel="noopener noreferrer">{item.text}</a>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className={styles.normsSpacerBottom} />
          </div>
        </div>
      </motion.div>
    </main>
  );
}
