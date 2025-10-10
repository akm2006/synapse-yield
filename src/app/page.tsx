'use client';

import Link from 'next/link';
import { ChevronRightIcon, ShieldCheckIcon, BoltIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Automated DeFi Yield,{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Secured by MetaMask
              </span>
            </h1>
            <p className="mt-6 text-xl leading-8 text-gray-300 max-w-3xl mx-auto">
              Our smart automation engine rebalances your funds to the highest-yielding protocols on the Monad network, so you don't have to.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/dashboard"
                className="group rounded-md bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all duration-200 flex items-center gap-2"
              >
                Launch App
                <ChevronRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/yield-optimizer"
                className="text-lg font-semibold leading-6 text-gray-300 hover:text-white transition-colors"
              >
                View Optimizer <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-24 bg-gray-900/50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-400">
              Get started with automated yield optimization in three simple steps
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {/* Step 1 */}
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/20 border border-blue-500/30">
                  <span className="text-2xl font-bold text-blue-400">1</span>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-white">Connect Wallet & Create Smart Account</h3>
                <p className="mt-2 text-gray-400">
                  Connect your MetaMask wallet and create a secure smart account with delegation capabilities.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-600/20 border border-purple-500/30">
                  <span className="text-2xl font-bold text-purple-400">2</span>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-white">Delegate & Deposit Funds</h3>
                <p className="mt-2 text-gray-400">
                  Set up secure delegation and deposit your MON tokens to start earning yield.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600/20 border border-green-500/30">
                  <span className="text-2xl font-bold text-green-400">3</span>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-white">Earn on Autopilot</h3>
                <p className="mt-2 text-gray-400">
                  Our automation engine continuously rebalances your funds to maximize yield across Kintsu and Magma protocols.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Built for Security & Efficiency
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-400">
              Advanced features that put you in control while maximizing your returns
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {/* Feature 1 */}
              <div className="group relative overflow-hidden rounded-2xl border border-gray-700 bg-gray-900/50 p-8 hover:border-blue-500/50 transition-all duration-300">
                <BoltIcon className="h-12 w-12 text-yellow-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Automated Yield</h3>
                <p className="text-gray-400">
                  Continuously monitors and rebalances between Kintsu and Magma protocols to capture the highest available APY.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group relative overflow-hidden rounded-2xl border border-gray-700 bg-gray-900/50 p-8 hover:border-purple-500/50 transition-all duration-300">
                <CurrencyDollarIcon className="h-12 w-12 text-green-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Gasless Transactions</h3>
                <p className="text-gray-400">
                  MetaMask Delegation Toolkit enables gasless rebalancing, so you keep more of your earnings.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group relative overflow-hidden rounded-2xl border border-gray-700 bg-gray-900/50 p-8 hover:border-green-500/50 transition-all duration-300">
                <ShieldCheckIcon className="h-12 w-12 text-blue-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Non-Custodial & Secure</h3>
                <p className="text-gray-400">
                  Your funds never leave your control. Smart account delegation provides security without compromising ownership.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white mb-8">
            Ready to Optimize Your Yield?
          </h2>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-sm hover:from-blue-500 hover:to-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all duration-200"
          >
            Get Started Now
            <ChevronRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
