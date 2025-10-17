// src/components/layout/GlobalLogger.tsx
'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLogger } from '@/providers/LoggerProvider';
import { usePathname } from 'next/navigation';
import TransactionLogger from '@/components/TransactionLogger';
import ExpandingButton from '@/components/common/ExpandingButton';
import { ListBulletIcon } from '@heroicons/react/24/outline';

export default function GlobalLogger() {
  const { logs, clearLogs } = useLogger();
  const [isOpen, setIsOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (logs.length > 0 && !isOpen) {
      setHasNew(true);
      const timer = setTimeout(() => setHasNew(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [logs.length, isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setHasNew(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        {pathname !== '/' && (
          <>
            <ExpandingButton
              icon={<ListBulletIcon className="h-6 w-6 text-gray-300" />}
              text="Live Log"
              onClick={handleToggle}
              isHovered={isHovered}
              onHoverStart={() => setIsHovered(true)}
              onHoverEnd={() => setIsHovered(false)}
            />
            {hasNew && !isOpen && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 pointer-events-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border-2 border-slate-900"></span>
              </span>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <TransactionLogger
            logs={logs}
            onClear={clearLogs}
            onClose={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}