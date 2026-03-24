'use server';

import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/types/session';

export async function getSession() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  return session;
}

export async function requestOtp(email: string) {
  const { db } = await import('@/firebase/admin');
  const { normalizeEmail } = await import('@/utils/normalizeEmail');
  const { generateOtp } = await import('@/utils/generateOtp');
  const { hashOtp } = await import('@/utils/hashOtp');
  const { sendOtpEmail } = await import('@/utils/sendEmail');

  const normalized = normalizeEmail(email);
  if (!db) return { success: false, error: 'Servicio no disponible.' };

  const otpDoc = await db.collection('otps').doc(normalized).get();
  const otpData = otpDoc.data();
  const now = Date.now();
  
  if (otpData) {
    const requestCount = otpData.requestCount || 0;
    const windowStart = otpData.windowStart || 0;
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    if (now - windowStart < FIFTEEN_MINUTES && requestCount >= 3) {
      return { success: false, error: 'Demasiados intentos. Espera 15 min.' };
    }
  }

  const otp = generateOtp();
  const hashed = hashOtp(otp);
  const windowStart = otpData && (now - (otpData.windowStart || 0) < 15 * 60 * 1000) ? otpData.windowStart : now;

  try {
    await db.collection('otps').doc(normalized).set({
      hashed,
      expiresAt: now + 10 * 60 * 1000,
      requestCount: (otpData?.windowStart && now - otpData.windowStart < 15 * 60 * 1000) ? (otpData.requestCount || 0) + 1 : 1,
      windowStart,
    });
    await sendOtpEmail(normalized, otp);
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Error al enviar.' };
  }
}

export async function verifyOtp(email: string, otp: string) {
  const { db } = await import('@/firebase/admin');
  const { normalizeEmail } = await import('@/utils/normalizeEmail');
  const { hashOtp } = await import('@/utils/hashOtp');
  const admin = await import('firebase-admin');

  const normalized = normalizeEmail(email);
  const hashed = hashOtp(otp);
  if (!db) return { success: false, error: 'Servicio no disponible.' };

  try {
    const otpDoc = await db.collection('otps').doc(normalized).get();
    if (!otpDoc.exists) return { success: false, error: 'Código no encontrado.' };
    const data = otpDoc.data();
    if (data?.hashed !== hashed || Date.now() > data?.expiresAt) {
      return { success: false, error: 'Código inválido.' };
    }

    await db.collection('otps').doc(normalized).delete();
    const userRef = db.collection('users').doc(normalized);
    const userDoc = await userRef.get();
    let sessionVersion = 1;
    
    if (!userDoc.exists) {
      await userRef.set({
        email: normalized,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        contacts: [],
        sessionVersion,
      });
    } else {
      sessionVersion = userDoc.data()?.sessionVersion || 1;
    }

    const session = await getSession();
    session.userId = normalized;
    session.email = normalized;
    session.isLoggedIn = true;
    session.sessionVersion = sessionVersion;
    await session.save();
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Error al verificar.' };
  }
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  return { success: true };
}
