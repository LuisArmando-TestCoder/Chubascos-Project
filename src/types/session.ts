import { SessionOptions } from 'iron-session';

export interface SessionData {
  userId: string;
  email: string;
  isLoggedIn: boolean;
  sessionVersion: number; // For server-side session invalidation
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'chubascos_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};
