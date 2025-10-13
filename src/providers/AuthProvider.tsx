'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef, // Import useRef
  ReactNode,
  useCallback,
} from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { SiweMessage } from 'siwe';

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

  // --- NEW: Use a ref to track the address ---
  const previousAddress = useRef<string | undefined>(address);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const userData = await res.json();
      if (res.ok) {
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

  // --- THE CRUCIAL FIX IS HERE ---
  useEffect(() => {
    // Check if the address has changed from a defined value to another defined value
    if (
      previousAddress.current &&
      address &&
      previousAddress.current !== address
    ) {
      console.log('Wallet account switched. Forcing logout.');
      // Force a logout to clear the old session
      signOut();
    }
    // Update the ref to the new address for the next render
    previousAddress.current = address;
  }, [address]);
  // --- END OF FIX ---

  const signIn = async () => {
    if (!address || !chainId) return;
    setIsLoading(true);
    try {
      // Expect a plain text response from /api/auth/nonce
      const nonceRes = await fetch('/api/auth/nonce');
      const nonce = await nonceRes.text();

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
        const errorBody = await verifyRes.text();
        throw new Error(`Error verifying signature: ${errorBody}`);
      }

      // After successful verification, immediately refetch the user state.
      await fetchUser();
    } catch (error) {
      console.error('Sign-in error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
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