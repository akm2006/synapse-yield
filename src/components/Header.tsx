'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  Bars3Icon,
  XMarkIcon,
  CpuChipIcon,
  HomeIcon,
  ArrowsRightLeftIcon,
  ArrowPathIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'Dashboard', href: '/dashboard', icon: CpuChipIcon },
  { name: 'Staking', href: '/stake', icon: ArrowPathIcon },
  { name: 'Swap', href: '/swap', icon: ArrowsRightLeftIcon },
  { name: 'Optimizer', href: '/yield-optimizer', icon: ChartBarIcon },
  { name: 'Activity', href: '/activity', icon: ChartBarIcon },
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
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
        className="fixed top-0 left-0 right-0 z-50 p-4"
      >
        <div
          className={`mx-auto max-w-7xl rounded-2xl transition-all duration-300 ${
            isScrolled
              ? 'bg-gray-950/70 backdrop-blur-xl border border-white/10 shadow-lg'
              : 'bg-transparent'
          }`}
        >
          <nav className="flex h-20 items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-3 group">
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  rotate: [0, 5, 0],
                }}
                transition={{ duration: 5, repeat: Infinity, repeatType: 'mirror' }}
              >
                <Image
                  src="/logo.png"
                  alt="Synapse Yield Logo"
                  width={36}
                  height={36}
                  className="transition-transform duration-300 group-hover:scale-110"
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
                <ConnectButton
                  chainStatus="icon"
                  showBalance={false}
                />
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

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            variants={mobileMenuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="lg:hidden fixed top-0 left-0 w-full h-screen bg-gray-950/90 backdrop-blur-lg z-50"
          >
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h2 className="font-bold text-white">Menu</h2>
              <button
                type="button"
                className="p-2 text-white/70 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 p-3 rounded-lg text-base font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-gradient-to-r from-blue-500/30 to-teal-500/30 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}