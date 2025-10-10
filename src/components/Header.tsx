'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { 
  Bars3Icon, 
  XMarkIcon, 
  ChartBarIcon,
  CpuChipIcon,
  HomeIcon,
  WalletIcon
} from '@heroicons/react/24/outline';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState<string | null>(null);
  const { smartAccountAddress } = useSmartAccount();
  const pathname = usePathname();

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const accounts = await (window as any).ethereum.request({ 
            method: 'eth_accounts' 
          });
          setConnectedAccount(accounts[0] || null);
        } catch (error) {
          console.error('Failed to check wallet connection:', error);
        }
      }
    };

    checkConnection();

    // Listen for account changes
    if ((window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
        setConnectedAccount(accounts[0] || null);
      });
    }

    return () => {
      if ((window as any).ethereum) {
        (window as any).ethereum.removeAllListeners('accountsChanged');
      }
    };
  }, []);

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        setConnectedAccount(accounts[0]);
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    } else {
      alert('Please install MetaMask to use this application');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const navigation = [
    { 
      name: 'Home', 
      href: '/', 
      icon: HomeIcon,
      current: pathname === '/' 
    },
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: CpuChipIcon,
      current: pathname === '/dashboard' 
    },
    { 
      name: 'Yield Optimizer', 
      href: '/yield-optimizer', 
      icon: ChartBarIcon,
      current: pathname === '/yield-optimizer' 
    },
  ];

  return (
    <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <CpuChipIcon className="h-6 w-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Synapse Yield
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    item.current
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center gap-4">
            {/* Smart Account Status */}
            {smartAccountAddress && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-green-600/10 border border-green-500/20 rounded-lg">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-400">Smart Account Active</span>
              </div>
            )}

            {/* Connect Wallet Button */}
            {connectedAccount ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg">
                <WalletIcon className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-white hidden sm:inline">
                  {formatAddress(connectedAccount)}
                </span>
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <WalletIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Connect Wallet</span>
              </button>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                type="button"
                className="p-2 text-gray-400 hover:text-white"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="space-y-1 py-4 border-t border-gray-700">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                      item.current
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
              
              {/* Mobile Smart Account Status */}
              {smartAccountAddress && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-600/10 border border-green-500/20 rounded-lg">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-400">Smart Account Active</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 px-3 font-mono break-all">
                    {smartAccountAddress}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
