// src/providers/ToastProvider.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import Toast from '@/components/common/Toast';

type ToastType = 'success' | 'error' | 'info' | 'loading';

// 1. Add txHash to the ToastMessage interface
export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
  duration?: number;
  txHash?: string;
}

// Accept a toast object for more flexibility
interface ToastContextType {
  // addToast now returns the numeric id so callers can dismiss loading toasts
  addToast: (toast: Omit<ToastMessage, 'id'>) => number;
  // allow components to remove toasts programmatically (used for loading toasts)
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // 2. Update addToast to accept an object
  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = toastId++;
    setToasts((prevToasts) => [...prevToasts, { id, ...toast }]);
    return id;
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast , removeToast }}>
      {children}
      {/* 1. This container is now centered at the top of the screen */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-3 w-full max-w-md px-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} onDismiss={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToasts() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToasts must be used within a ToastProvider');
  }
  return context;
}