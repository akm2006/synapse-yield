// src/providers/AuthProvider.tsx
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
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

  // Ref to track the address to detect changes
  const addressRef = useRef<string | undefined>(address);

  // Sign out function, callable internally or by user action
  const signOut = useCallback(async (isInternalCall = false) => {
    // Always destroy the server session
    await fetch('/api/auth/logout', { method: 'POST' });
    // Clear the user state in the app
    setUser(null);
    // If this is a user-initiated sign out, disconnect the wallet connector too
    if (!isInternalCall) {
      disconnect();
    }
  }, [disconnect]);

  // Fetches the user session from the backend and validates it against the current wallet address
  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const userData = await res.json();
        // **CRITICAL SECURITY CHECK**: Ensure the session user matches the connected wallet address.
        if (userData.address.toLowerCase() === address?.toLowerCase()) {
          setUser(userData);
        } else {
          // Mismatch found, this is a stale session. Force logout.
          console.log('Session mismatch detected. Forcing logout.');
          await signOut(true); // Internal call to prevent wallet disconnection
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [address, signOut]);

  const signIn = useCallback(async () => {
    if (!address || !chainId) return;
    setIsLoading(true);
    try {
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
        throw new Error('Error verifying signature');
      }

      await fetchUser(); // Refetch user state after successful sign-in
    } catch (error) {
      console.error('Sign-in error:', error);
      await signOut(true);
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId, signMessageAsync, fetchUser, signOut]);

  // Main effect to handle auth state changes based on wallet connection and address changes
  useEffect(() => {
    const handleAuth = async () => {
      // Case 1: Wallet is disconnected.
      if (!isConnected) {
        if (user) {
          await signOut(true); // Clear session if user was logged in
        }
        setIsLoading(false);
        addressRef.current = undefined; // Clear the ref
        return;
      }

      // Case 2: Wallet is connected, but address is not yet available.
      if (!address) {
        setIsLoading(true); // Wait for address
        return;
      }

      // Case 3: Address has changed from the previous render.
      if (addressRef.current && address.toLowerCase() !== addressRef.current.toLowerCase()) {
        console.log('Wallet account switched. Forcing re-authentication.');
        await signOut(true); // Force logout of the old session
      } else {
        // Case 4: Address is the same or it's the initial load.
        await fetchUser();
      }
      
      // Update the ref for the next render
      addressRef.current = address;
    };

    handleAuth();
  }, [address, isConnected, fetchUser, signOut]);


  return (
    <AuthContext.Provider
      // Ensure the signOut exposed to the app triggers a full wallet disconnect
      value={{ user, isAuthenticated: !!user, isLoading, signIn, signOut: () => signOut(false) }}
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