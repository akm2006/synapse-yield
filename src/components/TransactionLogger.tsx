'use client';
import { useState, useCallback } from 'react';

interface TransactionLoggerProps {
  title?: string;
  maxLogs?: number;
  logs: string[];
  onClear?: () => void;
}

export default function TransactionLogger({ 
  title = "Transaction Logs", 
  logs,
  onClear
}: TransactionLoggerProps) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {logs.length > 0 && onClear && (
          <button
            onClick={onClear}
            className="text-sm text-gray-400 hover:text-white px-2 py-1 rounded border border-gray-600 hover:border-gray-500"
          >
            Clear
          </button>
        )}
      </div>
      
      <div className="bg-black p-4 rounded font-mono text-sm h-64 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-gray-500 text-center">
            No logs yet. Actions will be logged here.
          </p>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="text-green-400 mb-1">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Custom hook for managing transaction logs
export function useTransactionLogger(maxLogs = 100) {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    console.log(message);
    setLogs(prev => {
      const newLogs = [...prev, message];
      return newLogs.length > maxLogs ? newLogs.slice(-maxLogs) : newLogs;
    });
  }, [maxLogs]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return { logs, addLog, clearLogs };
}
