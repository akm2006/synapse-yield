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
  WalletIcon,
  ArrowsRightLeftIcon,
  ArrowPathIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const { smartAccountAddress } = useSmartAccount();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      name: 'Staking', 
      href: '/stake', 
      icon: ArrowPathIcon,
      current: pathname === '/stake' 
    },
    { 
      name: 'Swap', 
      href: '/swap', 
      icon: ArrowsRightLeftIcon,
      current: pathname === '/swap' 
    },
    { 
      name: 'Optimizer', 
      href: '/yield-optimizer', 
      icon: ChartBarIcon,
      current: pathname === '/yield-optimizer' 

    },
     { 
      name: 'Activity', 
      href: '/activity', 
      icon: ChartBarIcon,
      current: pathname === '/activity' 
      
    },
  ];

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-gray-950/80 backdrop-blur-xl border-b border-white/10 shadow-lg' 
        : 'bg-transparent border-b border-white/5'
    }`}>
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative p-2.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <SparklesIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Synapse Yield
              </span>
              <p className="text-xs text-gray-500">Automated DeFi</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    item.current
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Smart Account Status */}
            {smartAccountAddress && (
              <div className="hidden xl:flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl backdrop-blur-sm">
                <div className="relative">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                </div>
                <span className="text-sm text-green-400 font-medium">Smart Account</span>
              </div>
            )}

            {/* Connect Wallet Button */}
            {connectedAccount ? (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm hover:bg-white/10 transition-all">
                <WalletIcon className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-white font-medium hidden sm:inline">
                  {formatAddress(connectedAccount)}
                </span>
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
              >
                <WalletIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Connect</span>
              </button>
            )}

            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open menu</span>
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-white/10 animate-fade-in">
            <div className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                      item.current
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              
              {/* Mobile Smart Account Status */}
              {smartAccountAddress && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-3 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <div className="flex-1">
                      <span className="text-sm text-green-400 font-medium block">Smart Account Active</span>
                      <p className="text-xs text-gray-500 font-mono mt-1 break-all">
                        {smartAccountAddress}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}