'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  Bars3Icon,
  XMarkIcon,
  CpuChipIcon,
  ArrowsRightLeftIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  WalletIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/providers/AuthProvider';
import { useAccount } from 'wagmi';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: CpuChipIcon },
  { name: 'Manage Funds', href: '/manage-funds', icon: WalletIcon },
  { name: 'Staking', href: '/stake', icon: ArrowPathIcon },
  { name: 'Swap', href: '/swap', icon: ArrowsRightLeftIcon },
  { name: 'Optimizer', href: '/yield-optimizer', icon: ChartBarIcon },
  { name: 'Activity', href: '/activity', icon: ListBulletIcon },
];

const navItemVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: 'easeOut',
    },
  }),
};

const mobileMenuVariants: Variants = {
  open: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  closed: {
    opacity: 0,
    y: '-100%',
    transition: { duration: 0.3, ease: 'easeIn' },
  },
};

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const pathname = usePathname();

  const { isAuthenticated, signIn, isLoading } = useAuth();
  const { isConnected } = useAccount();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const diff = currentScrollY - lastScrollY.current;

          // Only toggle if movement is significant (over 10px)
          if (Math.abs(diff) > 10) {
            if (diff > 0 && currentScrollY > 80) {
              // Scrolling down
              setIsVisible(false);
            } else if (diff < 0) {
              // Scrolling up
              setIsVisible(true);
            }
            lastScrollY.current = currentScrollY;
          }

          setIsScrolled(currentScrollY > 20);
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const AuthButton = () => {
    if (!isConnected) {
      return <ConnectButton chainStatus="icon" showBalance={false} />;
    }

    if (!isAuthenticated) {
      return (
        <button
          onClick={signIn}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full font-medium text-sm hover:bg-blue-700 transition-colors disabled:bg-blue-800"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      );
    }

    return <ConnectButton chainStatus="icon" showBalance={false} />;
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.header
            key="header"
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="fixed top-0 left-0 right-0 z-50 p-4"
          >
            <div
              className="mx-auto max-w-7xl rounded-2xl transition-all duration-300 bg-gray-950/70 backdrop-blur-xl shadow-lg">
              <nav className="flex h-20 items-center justify-between px-4 sm:px-6">
                <Link href="/" className="flex items-center gap-3 group">
                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                      rotate: [0, 5, 0],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      repeatType: 'mirror',
                    }}
                  >
                    <Image
                      src="/logo.png"
                      alt="Synapse Yield Logo"
                      width={36}
                      height={36}
                      className="transition-transform duration-300 group-hover:scale-110"
                      style={{ height: 'auto' }}
                    />
                  </motion.div>
                  <div className="hidden md:block">
                    <h1 className="text-xl font-bold text-white/90 tracking-tight">
                      Synapse Yield
                    </h1>
                  </div>
                </Link>

                <div className="hidden lg:flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-full">
                  {navigation.map((item, i) => (
                    <motion.div
                      key={item.name}
                      custom={i}
                      initial="hidden"
                      animate="visible"
                      variants={navItemVariants}
                    >
                      <Link
                        href={item.href}
                        className="relative px-4 py-2 rounded-full text-sm font-medium text-white/70 transition-colors duration-300 hover:text-white"
                      >
                        {pathname === item.href && (
                          <motion.span
                            layoutId="active-pill"
                            className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-teal-500/30 rounded-full"
                            transition={{
                              type: 'spring',
                              stiffness: 300,
                              damping: 30,
                            }}
                          />
                        )}
                        <span className="relative z-10">{item.name}</span>
                      </Link>
                    </motion.div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="bg-white/5 rounded-full p-1 border border-white/10">
                    <AuthButton />
                  </div>

                  <div className="lg:hidden">
                    <button
                      type="button"
                      className="p-2 text-white/70 hover:text-white"
                      onClick={() => setMobileMenuOpen(true)}
                    >
                      <Bars3Icon className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </nav>
            </div>
          </motion.header>
        )}
      </AnimatePresence>
    </>
  );
}
