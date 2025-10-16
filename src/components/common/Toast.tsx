'use client';

import React, { useState, useEffect, useRef,useCallback } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  XMarkIcon,
  LinkIcon,
} from '@heroicons/react/24/solid';
import { ToastMessage } from '@/providers/ToastProvider';

interface ToastProps extends ToastMessage {
  onDismiss: (id: number) => void;
}

const icons = {
  success: <CheckCircleIcon className="h-6 w-6 text-green-400" />,
  error: <XCircleIcon className="h-6 w-6 text-red-400" />,
  info: <InformationCircleIcon className="h-6 w-6 text-cyan-400" />,
  loading: <ArrowPathIcon className="h-6 w-6 text-gray-400 animate-spin" />,
};

const themeColors = {
  success: 'from-green-500/40 to-teal-500/40',
  error: 'from-red-500/40 to-orange-500/40',
  info: 'from-blue-500/40 to-cyan-500/40',
  loading: 'from-gray-500/40 to-gray-400/40',
};

const Toast: React.FC<ToastProps> = ({ id, message, type, duration = 5000, txHash, onDismiss }) => {
  const controls = useAnimationControls();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const remainingTimeRef = useRef(duration);
  const startTimeRef = useRef(Date.now());

  const startTimer = useCallback(() => {
    if (type !== 'loading') {
      startTimeRef.current = Date.now();
      controls.start({
        width: '0%',
        transition: { duration: remainingTimeRef.current / 1000, ease: 'linear' },
      });
      timerRef.current = setTimeout(() => onDismiss(id), remainingTimeRef.current);
    }
  }, [id, onDismiss, type, controls]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      const elapsedTime = Date.now() - startTimeRef.current;
      remainingTimeRef.current -= elapsedTime;
      controls.stop();
    }
  }, [controls]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [startTimer]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.8, transition: { duration: 0.2 } }}
      onHoverStart={pauseTimer}
      onHoverEnd={startTimer}
      className="relative w-full max-w-sm rounded-xl shadow-2xl shadow-black/50 bg-slate-900/80 backdrop-blur-xl border border-white/5 ring-1 ring-inset ring-white/10 overflow-hidden"
    >
      {/* Subtle glow effect */}
      <div className={`absolute -inset-px rounded-xl bg-gradient-to-r ${themeColors[type]} opacity-30 blur-xl -z-10`} />

      {/* Progress bar */}
      {type !== 'loading' && (
        <motion.div
          className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${themeColors[type]}`}
          initial={{ width: '100%' }}
          animate={controls}
        />
      )}
      
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/95 break-words">{message}</p>
          </div>
          <button
            onClick={() => onDismiss(id)}
            className="-mr-2 -mt-2 p-2 text-gray-500 rounded-full hover:bg-white/10 hover:text-white transition-colors flex-shrink-0"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {txHash && (
          <div className="mt-3 flex justify-end">
            <a
              href={`https://testnet.monadexplorer.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-900/50 text-xs text-cyan-300 hover:bg-cyan-900/80 transition-colors"
            >
              <LinkIcon className="h-3 w-3" />
              View on Explorer
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Toast;

