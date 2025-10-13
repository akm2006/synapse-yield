// src/lib/session.ts
import { SessionOptions } from 'iron-session';
import { SiweMessage } from 'siwe';

// Define the shape of our session data
export interface SessionData {
  nonce?: string;
  siwe?: SiweMessage;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD as string,
  cookieName: 'synapse-yield-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};