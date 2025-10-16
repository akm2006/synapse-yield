// src/components/TransactionLogger.tsx
'use client';

import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';

interface TransactionLoggerProps {
  logs: string[];
  onClear: () => void;
  onClose: () => void;
}

export default function TransactionLogger({
  logs,
  onClear,
  onClose,
}: TransactionLoggerProps) {
  // Enhanced color function to match the "Liquid Synapse" theme
  const getLogColor = (log: string) => {
    if (log.includes('[ERROR]')) return 'text-red-400';
    if (log.includes('[SUCCESS]')) return 'text-green-400';
    if (log.includes('[ACTION]')) return 'text-yellow-400';
    if (log.includes('[INFO]')) return 'text-cyan-400';
    if (log.includes('[TX]')) return 'text-purple-400';
    if (log.includes('[UO]')) return 'text-indigo-400';
    return 'text-gray-400'; // Default for timestamps etc.
  };

  return (
    // Backdrop
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-end"
    >
      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="w-full max-w-lg h-full bg-gray-950/80 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col"
      >
        <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white">Live Activity Log</h3>
          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <button
                onClick={onClear}
                className="p-2 text-gray-400 hover:text-white rounded-full transition-colors hover:bg-white/10"
                title="Clear logs"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-full transition-colors hover:bg-white/10"
              title="Close logger"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </header>

        <div className="flex-1 p-4 font-mono text-xs overflow-y-auto">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>No activity yet.</p>
            </div>
          ) : (
            <div className="flex flex-col-reverse">
              <AnimatePresence initial={false}>
                {logs.map((log, index) => (
                  <motion.div
                    key={index}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={`py-2 border-b border-white/5 whitespace-pre-wrap break-words ${getLogColor(
                      log
                    )}`}
                  >
                    {log}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}