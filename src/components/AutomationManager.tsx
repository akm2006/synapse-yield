'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';

interface AutomationManagerProps {
  hasDelegation: boolean;
  onLog: (message: string) => void;
}

export default function AutomationManager({
  hasDelegation,
  onLog,
}: AutomationManagerProps) {
  const { isAuthenticated } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the current automation status when the component mounts
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoading(true);
      fetch('/api/automation/status')
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) {
            setIsEnabled(data.automationEnabled);
          }
        })
        .catch((err) => console.error(err))
        .finally(() => setIsLoading(false));
    }
  }, [isAuthenticated]);

  const handleToggle = async () => {
    setIsLoading(true);
    onLog(`[ACTION] ${isEnabled ? 'Disabling' : 'Enabling'} automation...`);

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
      onLog(`[SUCCESS] Automation is now ${result.automationEnabled ? 'ENABLED' : 'DISABLED'}.`);
    } catch (error: any) {
      onLog(`[ERROR] ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasDelegation) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-6 text-center">
        <h3 className="text-xl font-semibold text-yellow-400 mb-2">
          Setup Delegation First
        </h3>
        <p className="text-gray-300">
          You must create a delegation before you can enable automated portfolio
          balancing.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Automated Portfolio Balancing
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Allow the Synapse Agent to automatically rebalance your portfolio.
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
            isEnabled ? 'bg-green-500' : 'bg-gray-600'
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}