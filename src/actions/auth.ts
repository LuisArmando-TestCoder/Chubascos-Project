import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/types/session';

import * as admin from 'firebase-admin';
import { db } from '@/firebase/admin';

import { normalizeEmail } from '@/utils/normalizeEmail';
import { generateOtp } from '@/utils/generateOtp';
import { hashOtp } from '@/utils/hashOtp';
import { sendOtpEmail } from '@/utils/sendEmail';

export async function getSession() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  return session;
}

export async function requestOtp(email: string) {
  const normalized = normalizeEmail(email);
  
  if (!db) return { success: false, error: 'Servicio no disponible.' };

  // Rate-limit OTP requests: max 3 per 15 minutes
  const otpDoc = await db.collection('otps').doc(normalized).get();
  const otpData = otpDoc.data();
  
  if (otpData) {
    const requestCount = otpData.requestCount || 0;
    const windowStart = otpData.windowStart || 0;
    const now = Date.now();
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    
    if (now - windowStart < FIFTEEN_MINUTES && requestCount >= 3) {
      return { 
        success: false, 
        error: 'Demasiados intentos. Por favor, espera 15 minutos antes de solicitar otro código.' 
      };
    }
  }

  const otp = generateOtp();
  const hashed = hashOtp(otp);
  const now = Date.now();
  const windowStart = otpData && (now - (otpData.windowStart || 0) < 15 * 60 * 1000) 
    ? otpData.windowStart 
    : now;

  try {
    await db.collection('otps').doc(normalized).set({
      hashed,
      expiresAt: now + 10 * 60 * 1000, // 10 minutes
      requestCount: (otpData?.windowStart && now - otpData.windowStart < 15 * 60 * 1000) 
        ? (otpData.requestCount || 0) + 1 
        : 1,
      windowStart,
    });

    await sendOtpEmail(normalized, otp);
    return { success: true };
  } catch (error) {
    console.error('Request OTP error:', error);
    return { success: false, error: 'No se pudo enviar el correo.' };
  }
}

export async function verifyOtp(email: string, otp: string) {
  const normalized = normalizeEmail(email);
  const hashed = hashOtp(otp);

  if (!db) return { success: false, error: 'Servicio no disponible.' };

  try {
    const otpDoc = await db.collection('otps').doc(normalized).get();
    
    if (!otpDoc.exists) {
      return { success: false, error: 'Código no encontrado o expirado.' };
    }

    const data = otpDoc.data();
    if (data?.hashed !== hashed || Date.now() > data?.expiresAt) {
      return { success: false, error: 'Código incorrecto o expirado.' };
    }

    // Success — delete OTP immediately (single-use)
    await db.collection('otps').doc(normalized).delete();

    // Ensure user document exists with session versioning
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
    console.error('Verify OTP error:', error);
    return { success: false, error: 'Error al verificar el código.' };
  }
}

export async function validateSession() {
  const session = await getSession();
  if (!session.isLoggedIn || !db) return null;

  try {
    const userDoc = await db.collection('users').doc(session.userId).get();
    if (!userDoc.exists) return null;

    const currentVersion = userDoc.data()?.sessionVersion;
    
    // If sessionVersion in db was bumped, session is invalidated
    if (currentVersion !== session.sessionVersion) {
      session.destroy();
      return null;
    }

    return session;
  } catch {
    return session; // Fail open on db error
  }
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  return { success: true };
}

export async function logoutAllSessions(userId: string) {
  if (!db) return { success: false };
  
  // Bump sessionVersion invalidates ALL currently issued cookies for this user
  await db.collection('users').doc(userId).update({
    sessionVersion: admin.firestore.FieldValue.increment(1),
  });
  
  const session = await getSession();
  session.destroy();
  
  return { success: true };
}
