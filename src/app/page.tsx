'use client';

import Link from 'next/link';
import { ChevronRightIcon, ShieldCheckIcon, BoltIcon, CurrencyDollarIcon, SparklesIcon, ArrowPathIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import Header  from '@/components/Header';
import Head from 'next/head';

export default function LandingPage() {
  const features = [
    {
      icon: BoltIcon,
      title: 'Automated Rebalancing',
      description: 'AI-powered engine continuously monitors and optimizes your yield across protocols.',
      gradient: 'from-yellow-500 to-orange-500'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Non-Custodial Security',
      description: 'Your keys, your crypto. Smart contracts ensure you always maintain full control.',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Gas-Efficient',
      description: 'Batch transactions and delegated operations minimize gas costs while maximizing returns.',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      icon: SparklesIcon,
      title: 'One-Click Operations',
      description: 'Stake, unstake, and swap with a single click through secure delegation.',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: ArrowPathIcon,
      title: 'Multi-Protocol Support',
      description: 'Seamlessly move assets between Kintsu, Magma, and other Monad protocols.',
      gradient: 'from-indigo-500 to-blue-500'
    },
    {
      icon: LockClosedIcon,
      title: 'MetaMask Delegation',
      description: 'Leverage cutting-edge delegation technology for secure, gasless transactions.',
      gradient: 'from-red-500 to-rose-500'
    }
  ];

  const stats = [
    { label: 'Total Value Locked', value: '$2.4M+' },
    { label: 'Active Users', value: '1,200+' },
    { label: 'Avg. APY', value: '12.8%' },
    { label: 'Protocols', value: '2+' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-purple-950 overflow-hidden">
      
      
<Header/>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Hero Section */}
      <div className="relative pt-20 pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full backdrop-blur-sm">
              <SparklesIcon className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-blue-300">Powered by MetaMask Delegation Toolkit</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="block text-white mb-2">Maximize Your Yield,</span>
              <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Minimize Your Effort
              </span>
            </h1>

            {/* Subheading */}
            <p className="mt-6 text-xl leading-8 text-gray-300 max-w-3xl mx-auto">
              Automated DeFi yield optimization on Monad. Set it, forget it, and watch your assets grow across the highest-yielding protocols.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <Link
                href="/dashboard"
                className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-semibold text-white shadow-lg hover:shadow-blue-500/25 transition-all duration-300 flex items-center gap-2 overflow-hidden"
              >
                <span className="relative z-10">Launch App</span>
                <ChevronRightIcon className="relative z-10 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Link>
              <Link
                href="/yield-optimizer"
                className="px-8 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl font-semibold text-white hover:bg-white/10 transition-all duration-300"
              >
                View Optimizer
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Everything You Need to Optimize Yield
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Advanced features designed for both beginners and DeFi veterans
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all duration-300 hover:transform hover:scale-105"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.gradient} bg-opacity-10 mb-4`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity`}></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="relative py-24 bg-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Get Started in Minutes</h2>
            <p className="text-lg text-gray-400">Three simple steps to automated yield</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                step: '01',
                title: 'Connect & Create',
                description: 'Link your MetaMask wallet and create a secure smart account with one click.',
                icon: '🔗'
              },
              {
                step: '02',
                title: 'Deposit & Delegate',
                description: 'Fund your smart account and set up delegation for automated operations.',
                icon: '💰'
              },
              {
                step: '03',
                title: 'Earn on Autopilot',
                description: 'Sit back as our engine continuously optimizes your yield across protocols.',
                icon: '🚀'
              }
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-6xl mb-4">{item.icon}</div>
                <div className="text-5xl font-bold text-white/10 absolute top-0 right-0">{item.step}</div>
                <h3 className="text-2xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="relative py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Optimize Your DeFi Returns?
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            Join thousands of users maximizing their yield on Monad
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-semibold text-lg text-white shadow-2xl hover:shadow-blue-500/25 transition-all duration-300"
          >
            Start Earning Now
            <ChevronRightIcon className="h-6 w-6" />
          </Link>
        </div>
      </div>
    </div>
  );
}