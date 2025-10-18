'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Switch } from '@headlessui/react';
import { CogIcon, ArrowPathIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/providers/AuthProvider';
import { useLogger } from '@/providers/LoggerProvider';
import { useToasts } from '@/providers/ToastProvider';
import Card from '@/components/common/Card'; // <-- Import the new Card component

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
    <Card delay={0.3}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ rotate: isToggling || isLoading ? 360 : 0 }}
            transition={{ duration: 1, repeat: isToggling || isLoading ? Infinity : 0, ease: 'linear' }}
          >
            <CogIcon
              className={`h-8 w-8 transition-colors ${
                isDisabled ? 'text-gray-600' : 'text-cyan-600'
              }`}
            />
          </motion.div>
          <div>
            <h3
              className={`text-xl font-semibold transition-colors ${
                isDisabled ? 'text-gray-500' : 'text-white'
              }`}
            >
              Automated Rebalancing
            </h3>
            <p
              className={`text-sm transition-colors ${
                isDisabled ? 'text-gray-600' : 'text-gray-400'
              }`}
            >
              {!hasDelegation
                ? 'Delegation setup required'
                : 'Automatically optimize portfolio yield.'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <ArrowPathIcon className="h-6 w-6 text-gray-500 animate-spin" />
        ) : (
          <Switch
            checked={isEnabled}
            onChange={handleToggle}
            disabled={isDisabled}
            className={`${
              isEnabled
                ? 'bg-gradient-to-r from-blue-500/70 to-teal-500/70'
                : 'bg-slate-800/80'
            } relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span
              className={`${
                isEnabled ? 'translate-x-7' : 'translate-x-1'
              } inline-flex items-center justify-center h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ease-in-out`}
            >
              {isEnabled && <ShieldCheckIcon className="h-4 w-4 text-blue-600"/>}
            </span>
          </Switch>
        )}
      </div>

      {!isLoading && hasDelegation && (
        <div
          className={`mt-4 text-sm font-medium flex items-center gap-2 transition-colors ${
            isEnabled ? 'text-green-400' : 'text-gray-500'
          }`}
        >
          <motion.span
            className="h-2.5 w-2.5 rounded-full"
            animate={{ 
              backgroundColor: isEnabled ? ['#10B981', '#6EE7B7', '#10B981'] : '#6B7280',
              boxShadow: isEnabled ? ['0 0 5px #10B981', '0 0 10px #6EE7B7', '0 0 5px #10B981'] : 'none',
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          {isEnabled ? 'Automation Active' : 'Automation Inactive'}
        </div>
      )}
    </Card>
  );
}

