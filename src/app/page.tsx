'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { 
  Float, 
  PerspectiveCamera, 
  Environment,
  Sphere,
  MeshDistortMaterial,
  Sparkles,
} from '@react-three/drei';
import { Suspense, useRef,useMemo } from 'react';
import * as THREE from 'three';
import Header from '@/components/Header';
import {
  ChevronRightIcon,
  SparklesIcon,
  BoltIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  LockClosedIcon,
  CpuChipIcon,
  KeyIcon,
  CircleStackIcon,
  MagnifyingGlassIcon,
  BeakerIcon,
  LinkIcon,
  RocketLaunchIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';

// --- 3D Components ---

// 3D Logo Component using image texture
function Logo3D({ imageUrl, position, scale = 1, rotation = [0, 0, 0] }: { 
  imageUrl: string; 
  position: [number, number, number]; 
  scale?: number;
  rotation?: [number, number, number];
}) {
  const texture = new THREE.TextureLoader().load(imageUrl);
  
  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
      <mesh position={position} rotation={rotation} scale={scale}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial 
          map={texture} 
          transparent 
          side={THREE.DoubleSide}
          emissive="#000000"
emissiveIntensity={0.2}
        />
      </mesh>
    </Float>
  );
}

// Monad Coin 3D Model
function MonadCoin({ position }: { position: [number, number, number] }) {
  // Load the texture (assuming 'monad-logo.png' is in /public)
  const texture = new THREE.TextureLoader().load('/images/feature-monad.png');

  return (
    <Float speed={1.8} rotationIntensity={0.5} floatIntensity={0.4}>
      <group position={position}>
        {/* Coin body - This still has its purple glow (emissive="#a855f7") */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.8, 0.8, 0.15, 64]} />
          <meshStandardMaterial
            color="#a855f7"
            metalness={0.9}
            roughness={0.1}
            emissive="#a855f7"
            emissiveIntensity={0.1}
          />
        </mesh>
        
        {/* Coin face - (Front) */}
        <mesh position={[0, 0, 0.08]} rotation={[0, 0, 0]}>
          <circleGeometry args={[0.6, 64]} />
          <meshStandardMaterial
            map={texture}
            color="#ffffff"
            transparent
            side={THREE.DoubleSide}
            metalness={0.8}
            roughness={0.2}
            // --- CHANGE HERE ---
            emissive="#000000"  // Changed from purple to black
            emissiveIntensity={0}     // Set intensity to 0
            // --- END CHANGE ---
          />
        </mesh>

        {/* Coin face - (Back) */}
        <mesh position={[0, 0, -0.08]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.6, 64]} />
          <meshStandardMaterial
            map={texture}
            color="#ffffff"
            transparent
            side={THREE.DoubleSide}
            metalness={0.8}
            roughness={0.2}
            // --- CHANGE HERE ---
            emissive="#000000"  // Changed from purple to black
            emissiveIntensity={0}     // Set intensity to 0
            // --- END CHANGE ---
          />
        </mesh>
      </group>
    </Float>
  );
}
// Hero 3D Scene with logo models
function Hero3DScene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 8]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#0ea5e9" />
      
      {/* MetaMask Logo - Center */}
      {/* TODO: Add metamask-logo.png to public/images/ folder */}
      <Logo3D imageUrl="/meta-mask.png" position={[0, 0, 0]} scale={1.2} />
      
      {/* Monad Coin - Right */}
      <MonadCoin position={[3, 0.5, -1]} />
      
      {/* Account Abstraction Icon - Left */}
      {/* TODO: Add account-abstraction-icon.png to public/images/ folder */}
      <Logo3D imageUrl="/images/pimlico-logo.png" position={[-2.5, -0.5, -0.5]} scale={0.8} />
      
      <Sparkles count={100} scale={10} size={2} speed={0.3} color="#0ea5e9" />
      <Environment preset="city" />
    </>
  );
}

// Feature Card 3D Icon - Now with actual logo images
function Feature3DIcon({ imageUrl, color }: { imageUrl: string; color: string }) {
  const texture = new THREE.TextureLoader().load(imageUrl);
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.3}>
        <mesh>
          <planeGeometry args={[3.5, 3.5]} />
          <meshStandardMaterial
            map={texture}
            transparent
            side={THREE.DoubleSide}
            emissive="#000000"
            emissiveIntensity={0.3}
          />
        </mesh>
      </Float>
    </>
  );
}

// Security Shield 3D with MetaMask logo
// Security Shield 3D (Extruded Shape)
// Security Shield 3D (using PNG image)
function SecurityShield3D() {
  // 1. Load the shield.png texture
  const texture = new THREE.TextureLoader().load('/shield.png');

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#a855f7" />
      
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.3}>
        <mesh>
          {/* 2. Create a plane to display the image */}
          <planeGeometry args={[5, 5]} /> {/* Adjust size as needed */}
          
          {/* 3. Apply the texture */}
          <meshStandardMaterial 
            map={texture}
            transparent // Important for the PNG's transparent background
            side={THREE.DoubleSide}
            color="#ffffff" // Set to white so the logo isn't tinted
            emissive="#a855f7" // Add the purple glow
            emissiveIntensity={0.3}
          />
        </mesh>
      </Float>
      
      <Sparkles count={50} scale={8} size={3} speed={0.2} color="#a855f7" />
      <Environment preset="sunset" />
    </>
  );
}
// Technology Network 3D with protocol logos
// Technology Network 3D with protocol logos
function TechnologyNetwork3D() {
  const groupRef = useRef<THREE.Group>(null);
  
  // 1. Load the central MetaMask logo texture
  // (Assuming 'metamask-logo.png' is in your /public folder)
  const metaMaskTexture = new THREE.TextureLoader().load('/metamask-logo.png');
  
  // Protocol positions around the circle
  const protocols = [
    { name: 'Pimlico', image: '/images/pimlico-logo.png', color: '#06b6d4' },
    { name: 'Envio', image: '/images/envio-logo.png', color: '#14b8a6' },
    { name: 'Monad', image: '/monad-logo.png', color: '#a855f7' },
    { name: 'ERC4337', image: '/images/erc4337-logo.png', color: '#0ea5e9' },
  ];
  
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 8]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      
      <group ref={groupRef}>
        {/* Create network nodes with protocol logos */}
        {protocols.map((protocol, i) => {
          const angle = (i / protocols.length) * Math.PI * 2;
          const radius = 2.5;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          // 2. Load the texture for each protocol
          const texture = new THREE.TextureLoader().load(protocol.image);
          
          return (
            <Float key={i} speed={1 + i * 0.2} rotationIntensity={0.2}>
              <group position={[x, y, 0]}>
                {/* Background glow (unchanged) */}
                <Sphere args={[0.4, 16, 16]}>
                  <meshStandardMaterial
                    color={protocol.color}
                    metalness={0.8}
                    roughness={0.2}
                    emissive={protocol.color}
                    emissiveIntensity={0.5}
                    transparent
                    opacity={0.3}
                  />
                </Sphere>
                {/* Logo image */}
                <mesh position={[0, 0, 0.1]}>
                  <planeGeometry args={[0.6, 0.6]} />
                  <meshStandardMaterial
                    // 3. Apply the texture here
                    map={texture}
                    color="#ffffff" // Set to white so it doesn't tint the logo
                    transparent
                    side={THREE.DoubleSide}
                    emissive={protocol.color}
                    emissiveIntensity={0.2}
                  />
                </mesh>
              </group>
            </Float>
          );
        })}
        
        {/* Central MetaMask node */}
        <Float speed={1.5} rotationIntensity={0.5}>
          <group position={[0, 0, 0]}>
            <Sphere args={[0.5, 32, 32]}>
              <MeshDistortMaterial
                color="#0ea5e9"
                attach="material"
                distort={0.3}
                speed={2}
                roughness={0.1}
                metalness={0.9}
              />
            </Sphere>
            {/* Central MetaMask logo */}
            <mesh position={[0, 0, 0.6]}>
              <planeGeometry args={[0.8, 0.8]} />
              <meshStandardMaterial
                // 4. Apply the central logo texture here
                map={metaMaskTexture}
                color="#ffffff" // Set to white
                transparent
                side={THREE.DoubleSide}
                emissive="#0ea5e9"
                emissiveIntensity={0.3}
              />
            </mesh>
          </group>
        </Float>
      </group>
      
      <Sparkles count={80} scale={12} size={2} speed={0.3} color="#06b6d4" />
      <Environment preset="warehouse" />
    </>
  );
}

// --- Data Arrays ---
const features = [
  {
    icon: BoltIcon,
    title: 'Automated Yield Optimization',
    description: 'Advanced keeper service continuously monitors APYs across Kintsu and Magma protocols, executing intelligent rebalancing strategies.',
    gradient: '#f59e0b',
    color3d: '#f59e0b',
    imageUrl: '/images/feature-automation.png',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Non-Custodial Security',
    description: 'MetaMask Delegation Toolkit enables scoped permissions without exposing private keys, ensuring complete asset control.',
    gradient: '#0ea5e9',
    color3d: '#0ea5e9',
    imageUrl: '/shield.png',
  },
  {
    icon: CpuChipIcon,
    title: 'Account Abstraction',
    description: 'Smart Account infrastructure enables transaction batching, gas optimization, and seamless automation via Pimlico.',
    gradient: '#14b8a6',
    color3d: '#14b8a6',
    imageUrl: '/images/feature-abstraction.png',
  },
  {
    icon: ArrowPathIcon,
    title: 'Multi-Protocol Integration',
    description: 'Unified interface for swapping between MON, WMON, sMON, and gMON with PancakeSwap Universal Router.',
    gradient: '#8b5cf6',
    color3d: '#8b5cf6',
    imageUrl: '/images/feature-integration.png',
  },
  {
    icon: MagnifyingGlassIcon,
    title: 'Real-Time Analytics',
    description: 'Envio Indexer provides comprehensive on-chain activity tracking and portfolio insights across all protocols.',
    gradient: '#ec4899',
    color3d: '#ec4899',
    imageUrl: '/images/feature-analytics.png',
  },
  {
    icon: LockClosedIcon,
    title: 'Monad Native',
    description: 'Purpose-built to leverage Monad network performance, scalability, and emerging ecosystem opportunities.',
    gradient: '#6366f1',
    color3d: '#6366f1',
    imageUrl: '/images/feature-monad.png',
  },
];

const technologies = [
  {
    icon: '/images/erc4337-logo.png', // Was: CpuChipIcon
    title: 'ERC-4337 Account Abstraction',
    description: 'Smart contract accounts via permissionless.js enable transaction batching, gas sponsorship, and enhanced UX patterns.',
    badge: 'Core Infrastructure',
  },
  {
    icon: '/images/tech-metamask.png', // Was: KeyIcon
    title: 'MetaMask Delegation',
    description: 'Secure, scoped permission system for automated operations without compromising wallet security or custody.',
    badge: 'Security Layer',
  },
  {
    icon: '/images/pimlico-logo.png', // Was: CircleStackIcon
    title: 'Pimlico Infrastructure',
    description: 'Enterprise-grade bundler and paymaster infrastructure for reliable UserOperation execution on Monad Testnet.',
    badge: 'Transaction Processing',
  },
  {
    icon: '/images/envio-logo.png', // Was: MagnifyingGlassIcon
    title: 'Envio Indexer',
    description: 'High-performance blockchain indexing for real-time event monitoring across Kintsu, Magma, and DEX protocols.',
   badge: 'Data Layer',
  },
];

const workflowSteps = [
  {
    number: '01',
    title: 'Connect Wallet',
    description: 'Link your MetaMask wallet and deploy a smart account with one click',
    icon: LinkIcon,
  },
  {
    number: '02',
    title: 'Fund & Delegate',
    description: 'Deposit assets and authorize scoped permissions for automated strategies',
    icon: CurrencyDollarIcon,
  },
  {
    number: '03',
    title: 'Optimize Returns',
    description: 'Enable automation or execute manual operations while tracking real-time performance',
    icon: ArrowTrendingUpIcon,
  },
];

const securityPillars = [
  {
    title: 'Non-Custodial Architecture',
    description: 'Assets remain exclusively in your smart account, controlled by your personal wallet at all times.',
  },
  {
    title: 'Granular Permissions',
    description: 'MetaMask Delegation enforces strict function-level access control for automated operations.',
  },
  {
    title: 'Zero Key Exposure',
    description: 'Private keys never leave your wallet. All authorizations use cryptographic message signing.',
  },
  {
    title: 'Secure Delegation Storage',
    description: 'Delegate keys managed using industry-standard encryption and secure backend infrastructure.',
  },
  {
    title: 'SIWE Authentication',
    description: 'Sign-In With Ethereum ensures wallet-based access control for account management.',
  },
];

const comparisonData = [
  { 
    feature: 'Network Environment',
    testnet: 'Monad Testnet',
    mainnet: 'Monad Mainnet',
  },
  {
    feature: 'APY Data Source',
    testnet: 'Simulated placeholder values',
    mainnet: 'Live on-chain data & oracle feeds',
  },
  {
    feature: 'Rebalancing Logic',
    testnet: 'Basic ratio-based strategy',
    mainnet: 'Advanced APY-aware optimization',
  },
  {
    feature: 'Transaction Model',
    testnet: 'Sequential UserOperations',
    mainnet: 'Atomic multi-call batching',
  },
  {
    feature: 'Gas Strategy',
    testnet: 'Pimlico sponsorship',
    mainnet: 'User-paid with advanced paymasters',
  },
  {
    feature: 'Security Posture',
    testnet: 'Development-grade keys',
    mainnet: 'Audited contracts & production security',
  },
];

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as any },
  };

  const staggerContainer = {
    initial: {},
    whileInView: {
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
    viewport: { once: true, amount: 0.1 },
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#05070D] text-white">
      {/* Refined Background */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 opacity-[0.02]" 
          style={{ 
            backgroundImage: `linear-gradient(rgba(100, 116, 139, 0.3) 1px, transparent 1px), linear-gradient(to right, rgba(100, 116, 139, 0.3) 1px, transparent 1px)`, 
            backgroundSize: '64px 64px' 
          }} 
        />
        <div 
          className="absolute inset-0 opacity-[0.04]" 
          style={{ 
            background: `radial-gradient(ellipse at 30% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(14, 165, 233, 0.1) 0%, transparent 50%)` 
          }} 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#05070D]/50 to-[#05070D]" />
      </div>

      <Header />

      <div className="relative z-10">
        {/* --- Hero Section with 3D --- */}
        <section className="relative px-4 pt-32 pb-24 md:pt-40 md:pb-32 lg:pt-48 lg:pb-40">
          {/* 3D Background */}
          <motion.div 
            style={{ opacity, scale }}
            className="absolute inset-0 -z-10"
          >
            <Canvas
              className="h-full w-full"
              gl={{ alpha: true, antialias: true }}
              dpr={[1, 2]}
            >
              <Suspense fallback={null}>
                <Hero3DScene />
              </Suspense>
            </Canvas>
          </motion.div>

          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as any }}
              >
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 backdrop-blur-md">
                  <SparklesIcon className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-300">
                    Smart Accounts × MetaMask Delegation × Monad
                  </span>
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as any }}
                className="mb-6 text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl"
              >
                Automated DeFi Yield
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                  Optimization on Monad
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl"
              >
                Synapse Yield leverages Account Abstraction and MetaMask Delegation to automate yield strategies across Kintsu and Magma with institutional-grade security.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="flex flex-col items-center justify-center gap-4 sm:flex-row"
              >
                <Link
                  href="/dashboard"
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-4 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105"
                >
                  <span className="relative z-10">Launch App</span>
                  <ChevronRightIcon className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="https://github.com/akm2006/synapse-yield"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-4 font-semibold text-white backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/10 hover:scale-105"
                >
                  View Documentation
                </a>
              </motion.div>
            </div>
          </div>
        </section>

        {/* --- Value Proposition --- */}
        <section className="px-4 py-20 md:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div {...fadeInUp}>
              <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-wider text-blue-400">
                The Challenge
              </span>
              <h2 className="mb-6 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                DeFi Yield Management is Complex
              </h2>
              <p className="mb-16 text-lg leading-relaxed text-gray-400">
                Manual yield optimization requires constant monitoring, gas-intensive transactions, and expert knowledge of multiple protocols—resulting in missed opportunities and reduced returns.
              </p>
            </motion.div>

            <motion.div {...fadeInUp} transition={{ delay: 0.1, ...fadeInUp.transition }}>
              <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-wider text-cyan-400">
                The Solution
              </span>
              <h2 className="mb-6 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                Intelligent Automation
              </h2>
              <p className="text-lg leading-relaxed text-gray-400">
                Synapse Yield automates yield optimization using Account Abstraction and secure MetaMask Delegation, maximizing returns while maintaining complete asset control.
              </p>
            </motion.div>
          </div>
        </section>

        {/* --- Features Grid with 3D Icons --- */}
        <section className="px-4 py-20 md:py-28">
          <div className="mx-auto max-w-7xl">
            <motion.div {...fadeInUp} className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                Platform Capabilities
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-gray-400">
                Enterprise-grade infrastructure for automated DeFi yield generation
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="whileInView"
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md transition-all hover:border-white/10 hover:bg-white/[0.04] hover:scale-105"
                >
                  {/* 3D Icon Container */}
                  <div className="relative h-32 w-full overflow-hidden">
                    <Canvas
                      className="h-full w-full"
                      gl={{ alpha: true, antialias: true }}
                      dpr={[1, 1.5]}
                    >
                      <Suspense fallback={null}>
                        <Feature3DIcon imageUrl={feature.imageUrl} color={feature.color3d} />
                      </Suspense>
                    </Canvas>
                  </div>

                  <div className="p-6">
                    <h3 className="mb-3 text-xl font-semibold text-white">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-gray-400">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* --- Workflow --- */}
        <section className="px-4 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <motion.div {...fadeInUp} className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                How It Works
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-gray-400">
                Get started with automated yield optimization in three steps
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="whileInView"
              className="relative"
            >
              <div className="space-y-16 lg:space-y-24">
                {workflowSteps.map((step, index) => (
                  <motion.div
                    key={index}
                    variants={fadeInUp}
                    className={`relative flex flex-col items-center gap-8 lg:flex-row ${
                      index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                    }`}
                  >
                    <div className="flex-1 text-center lg:text-left">
                      <div className="mb-4 inline-block rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-1 text-sm font-semibold text-white">
                        Step {step.number}
                      </div>
                      <h3 className="mb-3 text-2xl font-bold text-white">{step.title}</h3>
                      <p className="text-gray-400">{step.description}</p>
                    </div>

                    <div className="relative z-10 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-md lg:h-32 lg:w-32">
                      <step.icon className="h-12 w-12 text-cyan-400 lg:h-16 lg:w-16" />
                    </div>

                    <div className="hidden flex-1 lg:block" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- Technology Stack with 3D Network --- */}
        <section className="relative px-4 py-20 md:py-28">
          {/* 3D Network Background */}
          <div className="absolute inset-0 -z-10 opacity-30">
            <Canvas
              className="h-full w-full"
              gl={{ alpha: true, antialias: true }}
              dpr={[1, 1.5]}
            >
              <Suspense fallback={null}>
                <TechnologyNetwork3D />
              </Suspense>
            </Canvas>
          </div>

          <div className="mx-auto max-w-7xl">
            <motion.div {...fadeInUp} className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                Technology Stack
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-gray-400">
                Built on cutting-edge blockchain infrastructure
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="whileInView"
              className="grid gap-6 md:grid-cols-2"
            >
              {technologies.map((tech, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-md transition-all hover:border-white/10 hover:bg-white/[0.04] hover:scale-105"
                >
  <div className="mb-6 flex items-start justify-between">
            {/* 1. Made container bigger (h-12 w-12) and relative */}
            <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
              <Image 
                src={tech.icon} 
                alt={`${tech.title} icon`} 
                fill // 2. Use 'fill' to expand to parent
                className="rounded-xl object-contain p-1" // 3. 'p-2' adds padding, 'object-contain' respects aspect ratio
              />
            </div>
            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
              {tech.badge}
            </span>
          </div>
                  <h3 className="mb-3 text-xl font-semibold text-white">{tech.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-400">{tech.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* --- Security with 3D Shield --- */}
        <section className="relative px-4 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <motion.div {...fadeInUp} className="mb-16 text-center">
              <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-wider text-purple-400">
                Security First
              </span>
              <h2 className="mb-6 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                Non-Custodial by Design
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-gray-400">
                Multi-layered security architecture ensures complete asset control
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="whileInView"
              className="grid gap-8 md:grid-cols-2 lg:gap-12"
            >
              {/* 3D Shield */}
              <motion.div variants={fadeInUp} className="flex items-center justify-center">
                <div className="relative h-96 w-full">
                  <Canvas
                    className="h-full w-full"
                    gl={{ alpha: true, antialias: true }}
                    dpr={[1, 2]}
                  >
                    <Suspense fallback={null}>
                      <SecurityShield3D />
                    </Suspense>
                  </Canvas>
                </div>
              </motion.div>

              {/* Security Pillars */}
              <motion.div variants={staggerContainer} className="space-y-6">
                {securityPillars.map((pillar, index) => (
                  <motion.div
                    key={index}
                    variants={fadeInUp}
                    className="flex gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-md transition-all hover:border-white/10 hover:bg-white/[0.04]"
                  >
                    <CheckCircleIcon className="h-6 w-6 flex-shrink-0 text-emerald-400" />
                    <div>
                      <h4 className="mb-2 font-semibold text-white">{pillar.title}</h4>
                      <p className="text-sm leading-relaxed text-gray-400">{pillar.description}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* --- Testnet vs Mainnet --- */}
        <section className="px-4 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <motion.div {...fadeInUp} className="mb-16 text-center">
              <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-wider text-amber-400">
                Development Roadmap
              </span>
              <h2 className="mb-6 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                Testnet to Mainnet Evolution
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-gray-400">
                Currently active on Monad Testnet with a clear path to production
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Feature</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-amber-400">
                        <div className="flex items-center gap-2">
                          <BeakerIcon className="h-5 w-5" />
                          Testnet
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-400">
                        <div className="flex items-center gap-2">
                          <RocketLaunchIcon className="h-5 w-5" />
                          Mainnet
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, index) => (
                      <tr
                        key={index}
                        className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-6 py-4 font-medium text-white">{row.feature}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{row.testnet}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{row.mainnet}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- CTA --- */}
        <section className="px-4 py-24 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div {...fadeInUp}>
              <h2 className="mb-6 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                Start Optimizing Your Yields
              </h2>
              <p className="mb-10 text-lg text-gray-400">
                Experience automated DeFi yield generation on Monad Testnet
              </p>
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-10 py-5 text-lg font-semibold text-white shadow-2xl shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:scale-105"
              >
                Launch Application
                <ChevronRightIcon className="h-6 w-6 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>
        </section>

        {/* --- Footer --- */}
        <footer className="border-t border-white/5 px-4 py-12 backdrop-blur-md">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              <a
                href="https://github.com/akm2006/synapse-yield"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                GitHub
              </a>
              <a
                href="https://monad.xyz/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                Monad Network
              </a>
              <a
                href="https://docs.metamask.io/guide/delegation-api.html"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                MetaMask Delegation
              </a>
              <a
                href="https://www.pimlico.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                Pimlico
              </a>
              <a
                href="https://envio.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                Envio
              </a>
            </div>
            <div className="space-y-2 text-center text-xs text-gray-500">
              
              <p>&copy; {new Date().getFullYear()} Synapse Yield. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}