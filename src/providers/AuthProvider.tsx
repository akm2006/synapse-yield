// src/providers/AuthProvider.tsx
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { SiweMessage } from 'siwe';
import { monadTestnet } from '@/lib/smartAccountClient';

interface AuthContextType {
  user: SiweMessage | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SiweMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // This useEffect is no longer needed, as signout/disconnect handles it.
  // useEffect(() => {
  //   if (!isConnected) {
  //     setUser(null);
  //   }
  // }, [isConnected]);

  const signIn = async () => {
    if (!address || !chainId) return;

    setIsLoading(true);
    try {
      const nonceRes = await fetch('/api/auth/nonce');
      const { nonce } = await nonceRes.json();

      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to Synapse Yield',
        uri: window.location.origin,
        version: '1',
        chainId: chainId,
        nonce,
      });

      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });

      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      });

      if (!verifyRes.ok) {
        // Provide a more specific error
        const errorBody = await verifyRes.text();
        throw new Error(`Error verifying signature: ${errorBody}`);
      }

      await fetchUser();
    } catch (error) {
      console.error('Sign-in error:', error);
      setUser(null);
      // Ensure we stop loading even on error
      setIsLoading(false);
    }
    // No finally block needed here, it's handled in the catch
  };

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    disconnect();
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};