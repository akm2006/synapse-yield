// src/lib/session.ts
import { SessionOptions } from 'iron-session';
import { SiweMessage } from 'siwe';

export interface SessionData {
  nonce?: string;
  siwe?: SiweMessage;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD as string,
  cookieName: 'synapse-yield-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    path: '/', // <-- THE CRUCIAL FIX: Make the cookie available to all API routes
  },
};