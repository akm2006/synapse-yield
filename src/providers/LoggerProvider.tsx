// src/providers/LoggerProvider.tsx
'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

// 1. Define the shape of the context data
interface LoggerContextType {
  logs: string[];
  addLog: (message: string) => void;
  clearLogs: () => void;
}

// 2. Create the context
const LoggerContext = createContext<LoggerContextType | null>(null);

// 3. Move your existing hook logic here
function useTransactionLoggerState(maxLogs = 100) {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback(
    (message: string) => {
      // Also log to the console for debugging
      console.log(message);
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => {
        const newLogs = [...prev, `[${timestamp}] ${message}`];
        // Keep the log array from growing indefinitely
        return newLogs.length > maxLogs ? newLogs.slice(-maxLogs) : newLogs;
      });
    },
    [maxLogs]
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return { logs, addLog, clearLogs };
}

// 4. Create the provider component
export function LoggerProvider({ children }: { children: ReactNode }) {
  const loggerState = useTransactionLoggerState();

  return (
    <LoggerContext.Provider value={loggerState}>
      {children}
    </LoggerContext.Provider>
  );
}

// 5. Create a custom hook for easy access to the context
export function useLogger() {
  const context = useContext(LoggerContext);
  if (!context) {
    throw new Error('useLogger must be used within a LoggerProvider');
  }
  return context;
}