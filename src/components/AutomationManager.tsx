'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Switch } from '@headlessui/react';
import { CogIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/providers/AuthProvider';
import { useLogger } from '@/providers/LoggerProvider';
import { useToasts } from '@/providers/ToastProvider';

interface AutomationManagerProps {
  hasDelegation: boolean;
}

export default function AutomationManager({ hasDelegation }: AutomationManagerProps) {
  const { isAuthenticated } = useAuth();
  const { addLog } = useLogger();
  const { addToast, removeToast } = useToasts();

  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (isAuthenticated && hasDelegation) {
      setIsLoading(true);
      fetch('/api/automation/status')
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data.ok) {
            setIsEnabled(data.automationEnabled);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.error('Failed to fetch automation status:', err);
            addLog(`[ERROR] Failed to fetch automation status: ${err.message}`);
          }
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    } else {
      setIsEnabled(false);
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, hasDelegation, addLog]);

  const handleToggle = async (checked: boolean) => {
    if (!hasDelegation || !isAuthenticated || isToggling || isLoading) return;

    setIsToggling(true);
    addLog(`[ACTION] ${isEnabled ? 'Disabling' : 'Enabling'} automation...`);

    const loadingToastId = addToast({
      message: `${isEnabled ? 'Disabling' : 'Enabling'} automation...`,
      type: 'loading',
      duration: 10000,
    });

    try {
      const response = await fetch('/api/automation/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !isEnabled }),
      });

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.message || 'Failed to update setting.');
      }

      setIsEnabled(result.automationEnabled);
      addLog(
        `[SUCCESS] Automation is now ${
          result.automationEnabled ? 'ENABLED' : 'DISABLED'
        }.`
      );
      addToast({
        message: `Automation ${
          result.automationEnabled ? 'enabled' : 'disabled'
        } successfully.`,
        type: 'success',
      });
    } catch (error: any) {
      addLog(`[ERROR] ${error.message}`);
      addToast({
        message: `Failed to ${isEnabled ? 'disable' : 'enable'} automation.`,
        type: 'error',
      });
    } finally {
      setIsToggling(false);
      try {
        removeToast(loadingToastId);
      } catch {}
    }
  };

  const isDisabled =
    !hasDelegation || !isAuthenticated || isLoading || isToggling;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.2,
        duration: 0.5,
        ease: 'easeOut',
      }}
      className="
        backdrop-blur-md
        bg-gray-900/60
        border border-white/10
        shadow-lg shadow-black/40
        hover:border-purple-700/30
        hover:bg-gray-900/70
        rounded-2xl
        p-6
        transition-all
        duration-300
      "
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CogIcon
            className={`h-6 w-6 ${
              isDisabled ? 'text-gray-600' : 'text-purple-300'
            } ${isToggling ? 'animate-spin' : ''}`}
          />
          <div>
            <h3
              className={`text-lg font-semibold ${
                isDisabled ? 'text-gray-500' : 'text-white'
              }`}
            >
              Automated Rebalancing
            </h3>
            <p
              className={`text-xs ${
                isDisabled ? 'text-gray-600' : 'text-gray-400'
              }`}
            >
              {!hasDelegation
                ? 'Delegation setup required'
                : 'Automatically optimize yield between protocols.'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <ArrowPathIcon className="h-5 w-5 text-gray-500 animate-spin" />
        ) : (
          <Switch
            checked={isEnabled}
            onChange={handleToggle}
            disabled={isDisabled}
            className={`${
              isEnabled
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
                : 'bg-gray-700/60'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span
              className={`${
                isEnabled ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow`}
            />
          </Switch>
        )}
      </div>

      {!isLoading && hasDelegation && (
        <div
          className={`mt-3 text-xs flex items-center gap-1.5 ${
            isEnabled ? 'text-green-400' : 'text-gray-500'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isEnabled ? 'bg-green-400' : 'bg-gray-500'
            }`}
          ></span>
          {isEnabled ? 'Automation Active' : 'Automation Inactive'}
        </div>
      )}
    </motion.div>
  );
}
