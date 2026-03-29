import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/types/session';

export async function GET() {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ isLoggedIn: false });
    }

    // Fetch username from Firestore
    const { db } = await import('@/firebase/admin');
    let username = '';
    if (db) {
      const userDoc = await db.collection('users').doc(session.userId).get();
      username = userDoc.data()?.username || '';
    }

    return NextResponse.json({
      isLoggedIn: true,
      userId: session.userId,
      email: session.email,
      username,
    });
  } catch {
    return NextResponse.json({ isLoggedIn: false });
  }
}
