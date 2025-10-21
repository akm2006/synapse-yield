"use client";
import { useGLTF } from "@react-three/drei";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Float,
  PerspectiveCamera,
  Environment,
  Sparkles,
  Stars,
} from "@react-three/drei";
import { Suspense, useRef, useEffect, useMemo, memo } from "react";
import * as THREE from "three";
import Header from "@/components/Header";
import { Timeline, TimelineEntry } from "@/components/ui/timeline";
import { FeatureCard, AnimatedContainer } from "@/components/ui/GridFeatureCards";
import {
  ChevronRightIcon,
  BoltIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ArrowsRightLeftIcon,
  ListBulletIcon,
  CpuChipIcon,
  BeakerIcon,
  LinkIcon,
  RocketLaunchIcon,
  ArrowTrendingUpIcon,
  FireIcon,
  XCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import Image from "next/image";

const Coin3D = memo(function Coin3D({
  position,
  imageUrl,
  color = "#a855f7",
  scale = 1,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  imageUrl: string;
  color?: string;
  scale?: number;
  rotation?: [number, number, number];
}) {
  const texture = useMemo(() => {
    try {
      const loadedTexture = new THREE.TextureLoader().load(imageUrl);
      loadedTexture.colorSpace = THREE.SRGBColorSpace;
      return loadedTexture;
    } catch {
      return new THREE.Texture(); // Fallback texture
    }
  }, [imageUrl]);

  return (
    <Float speed={1.8} rotationIntensity={1} floatIntensity={0.7}>
      <group position={position} scale={scale} rotation={rotation}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.8, 0.8, 0.15, 64]} />
          <meshStandardMaterial
            color={color}
            metalness={0.9}
            roughness={0.1}
            emissive={color}
            emissiveIntensity={0.1}
          />
        </mesh>

        <mesh position={[0, 0, 0.08]} rotation={[0, 0, 0]}>
          <circleGeometry args={[0.75, 64]} />
          <meshStandardMaterial
            map={texture}
            color="#ffffff"
            transparent
            side={THREE.DoubleSide}
            metalness={0.8}
            roughness={0.2}
            emissive="#000000"
            emissiveIntensity={0}
            alphaTest={0.5}
          />
        </mesh>

        <mesh position={[0, 0, -0.08]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.6, 64]} />
          <meshStandardMaterial
            map={texture}
            color="#ffffff"
            transparent
            side={THREE.DoubleSide}
            metalness={0.8}
            roughness={0.2}
            emissive="#000000"
            emissiveIntensity={0}
            alphaTest={0.5}
          />
        </mesh>
      </group>
    </Float>
  );
});

const Hero3DScene = memo(function Hero3DScene() {
  const orbitingLightRef = useRef<THREE.SpotLight>(null);
  const lightTargetRef = useRef<THREE.Object3D>(new THREE.Object3D()); // Create target object
  useFrame((state) => {
    if (orbitingLightRef.current) {
      const time = state.clock.elapsedTime;
      const radius = 5.0;
      const speed = 0.7; // Adjust speed

      // Calculate position for clockwise orbit
      const x = Math.cos(-time * speed) * radius;
      const z = Math.sin(-time * speed) * radius;
      const y = 1.5 + Math.sin(time * speed * 0.5) * 0.8; // Adjust height/oscillation

      orbitingLightRef.current.position.set(x, y, z);

      // Make sure the target is updated if it moves (though it's static here)
      orbitingLightRef.current.target = lightTargetRef.current;
      // Optional: Slightly move the target point for a sweeping effect
      // lightTargetRef.current.position.x = Math.sin(time * 0.3) * 0.5;
    }
  });
  useEffect(() => {
    if (lightTargetRef.current) {
      lightTargetRef.current.position.set(0, 0, 0); // Point towards the center coin
    }
  }, []);
  useEffect(() => {
    if (lightTargetRef.current) {
      lightTargetRef.current.position.set(0, 0, 0); // Point towards the center coin
    }
  }, []);
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 8]} />
      {/* Reduced ambient light to make point light more prominent */}
      <ambientLight intensity={5} />
      {/* Keep a directional light for overall scene lighting */}
      <directionalLight position={[100, 100, 50]} intensity={0.8} />
      <primitive object={lightTargetRef.current} />
      <spotLight
        ref={orbitingLightRef}
        intensity={500} // Spotlights often need higher intensity
        distance={30} // How far the light reaches
        angle={Math.PI / 10} // Narrow cone angle for a "ray" (adjust: smaller is narrower)
        penumbra={0.2} // Softness of the cone edge (0=sharp, 1=soft)
        decay={1.2} // How quickly light falls off
        color="#ffffff" // Example: Teal color
        position={[5, 2, 0]} // Initial position
        target={lightTargetRef.current} // Set target (already done in useFrame)
        //  castShadow // Optional: enable shadows for more realism (can impact performance)
      />
      {/* --- End SpotLight --- */}
      {/* 1. App Logo Coin (Center) */}
      <Coin3D
        imageUrl="/synapse.png" // Use your app logo
        position={[-5.5, 1.2, 0]} // Center position
        color="#0ea5e9" // Example color (cyan)
        scale={1.1}
        rotation={[-0.3, 0.8, 0.1]} // Slightly larger in the center
      />
      <Coin3D
        imageUrl="/images/envio-logo.png" // Use your app logo
        position={[5.5, -1.5, 0]} // Center position
        color="#f5bd25" // Example color (cyan)
        scale={0.9}
        rotation={[-0.2, -1.0, 0.5]} // Slightly larger in the center
      />
      {/* 2. Monad Coin (Right Side) */}

      {/* Adjusted position */}
      <Coin3D
        position={[5, 1.5, -1]}
        imageUrl="/images/feature-monad.png"
        color="#a855f7"
        scale={1}
        rotation={[-0.1, 0.2, 0]}
      />
      {/* 3. MetaMask Coin (Left Side) */}
      <Coin3D
        imageUrl="/meta-mask.png" // Use MetaMask logo
        position={[-5, -2, -0.5]} // Adjusted position
        color="#F6851B" // MetaMask orange color
        scale={1}
        rotation={[-0.5, 0.8, 0]} // Standard scale
      />
      {/* --- Removed Pimlico Logo --- */}
      {/* --- Add Subtle Stars --- */}
      <Stars
        radius={100} // Distance of stars
        depth={50} // Depth of star field
        count={3000} // Number of stars (reduce for more subtlety)
        factor={3} // Size factor (reduce for smaller stars)
        saturation={0} // Makes stars white/grayscale
        fade // Stars fade in/out at edges
        speed={0.3} // Slow rotation speed
      />
      {/* --- End Stars --- */}

      <Environment preset="night" />
    </>
  );
});



const Padlock3D = memo(function Padlock3D() {
  const { scene } = useGLTF("/models/3Dpadlock.glb");
  const copiedScene = useMemo(() => scene.clone(), [scene]);
  const modelRef = useRef<THREE.Group>(null);

  const initialRotation: [number, number, number] = [-0.3, 0.8, 0];
  useFrame((state, delta) => {
  if (modelRef.current) {
    const { x, y } = state.mouse;

    // Very subtle auto-rotation
    const autoRotationSpeed = 0.3;
    
    // Calculate target rotation based on initial rotation + mouse offset + auto-rotation
    const targetRotationY = initialRotation[1] + x * 0.3 + (state.clock.elapsedTime * autoRotationSpeed);
    const targetRotationX = initialRotation[0] - y * 0.3;

    // Smoothly interpolate towards the target rotation
    modelRef.current.rotation.y = THREE.MathUtils.lerp(
      modelRef.current.rotation.y,
      targetRotationY,
      0.02
    );
    modelRef.current.rotation.x = THREE.MathUtils.lerp(
      modelRef.current.rotation.x,
      targetRotationX,
      0.05
    );
  }
});
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <ambientLight intensity={1.0} />
      <pointLight position={[10, 10, 10]} intensity={200} />
      <pointLight position={[-10, -5, -10]} color="#a855f7" intensity={50} />

      <primitive
        ref={modelRef}
        object={copiedScene}
        scale={1.5}
        position={[0, 0, 0]}
        rotation={initialRotation}
      />
      <Environment preset="sunset" />
    </>
  );
});
useGLTF.preload("/models/3Dpadlock.glb");

// --- Data Arrays ---
const features = [
  {
    icon: CpuChipIcon,
    title: "Smart Account Abstraction",
    description:
      "Leverage ERC-4337 Smart Accounts (via Pimlico & permissionless.js) for enhanced UX, transaction batching, and enabling automated actions.",
    gradient: "#14b8a6", // Teal gradient
    color3d: "#14b8a6",
    imageUrl: "/images/feature-abstraction.png", // Existing image seems okay
  },
  {
    icon: ShieldCheckIcon,
    title: "Non-Custodial Delegation",
    description:
      "Securely grant scoped permissions using MetaMask Delegation Toolkit, allowing automated actions without compromising private key security.",
    gradient: "#0ea5e9", // Sky blue gradient
    color3d: "#0ea5e9",
    imageUrl: "/images/feature-delegation.png", // Existing security shield image
  },
  {
    icon: BoltIcon,
    title: "Automated Yield Optimization",
    description:
      "Enable the optional keeper service (runs via Cron) to automatically monitor yields and rebalance assets between integrated protocols for optimal returns.",
    gradient: "#f59e0b", // Amber gradient
    color3d: "#f59e0b",
    imageUrl: "/images/feature-automation.png", // Existing automation image
  },
  {
    icon: ArrowsRightLeftIcon, // Changed icon
    title: "One-Click DeFi Actions",
    description:
      "Perform staking, unstaking (standard & instant via swap), and token swaps through the delegated Smart Account with a single confirmation.",
    gradient: "#8b5cf6", // Violet gradient
    color3d: "#8b5cf6",
    imageUrl: "/images/feature-oneclick.png", // Existing integration image might work
  },
  {
    icon: CurrencyDollarIcon,
    title: "Simplified Fund Management", // Renamed from Gas Sponsorship as it's testnet specific
    description:
      "Easily transfer assets (MON, ERC-20 tokens) between your wallet (EOA) and your Smart Account.",
    gradient: "#ec4899", // Pink gradient
    color3d: "#ec4899",
    // We might need a better image representing funding or gas
    imageUrl: "/images/feature-fundmanage.png", // Placeholder - NEED AN ICON IMAGE
  },
  {
    icon: ListBulletIcon, // Changed icon
    title: "Real-Time Activity Feed",
    description:
      "Track both your Smart Account's actions and public protocol events (stakes, swaps) using real-time data indexed by Envio GraphQL.",
    gradient: "#6366f1", // Indigo gradient
    color3d: "#6366f1",
    imageUrl: "/images/feature-activity.png", // Existing analytics image
  },
];
const technologies = [
  {
    icon: "/images/tech-metamask.png",
    title: "MetaMask Delegation",
    description: "Utilizes the Delegation Toolkit for secure, non-custodial automation, enabling scoped permissions without exposing private keys.",
    badge: "Security Layer",
  },
  {
    icon: "/images/tech/erc4337.png",
    title: "Account Abstraction",
    description: "Built on ERC-4337 Smart Accounts, orchestrated with permissionless.js for transaction batching and enhanced UX.",
    badge: "Core Standard",
  },
  {
    icon: "/images/tech/pimlico.png",
    title: "Pimlico",
    description: "Leverages Pimlico's enterprise-grade Bundler and Paymaster for reliable UserOperation execution on the Monad Testnet.",
    badge: "AA Infrastructure",
  },
  {
    icon: "/images/tech/next.png",
    title: "Next.js",
    description: "A modern, performant frontend built with the Next.js App Router, serverless functions, and TypeScript for a seamless user experience.",
    badge: "Full-Stack Framework",
  },
  {
    icon: "/images/tech/wagmi.png",
    title: "Wagmi & Viem",
    description: "Provides robust, type-safe React hooks and low-level utilities for all blockchain interactions, ensuring stability and reliability.",
    badge: "Web3 Interaction",
  },
  {
    icon: "/images/tech/siwe.png",
    title: "SIWE & Iron Session",
    description: "Implements secure, server-side authentication using Sign-In With Ethereum (SIWE) and encrypted session management with Iron Session.",
    badge: "Authentication",
  },
  {
    icon: "/images/tech/mongodb.png",
    title: "MongoDB",
    description: "Stores user data, including delegation details and automation preferences, using Mongoose for structured and scalable data management.",
    badge: "Database",
  },
  {
    icon: "/images/tech/envio.png",
    title: "Envio",
    description: "Provides high-performance, real-time data indexing from the blockchain via a custom GraphQL API for the live activity feed.",
    badge: "Data Indexing",
  },
  {
    icon: "/images/tech/fastcron.png",
    title: "FastCron",
    description: "Reliably triggers the serverless keeper function on a schedule to perform automated portfolio rebalancing for opted-in users.",
    badge: "Automation",
  },
];
// ---
// --- UPDATED WORKFLOW DATA for the new Timeline component ---
const workflowData: TimelineEntry[] = [
  {
    title: "01",
    name: "Connect & Deploy",
        icon: LinkIcon, // Added Icon
    description:
      "Easily connect your existing MetaMask wallet and Sign-In. With a single click, a new, secure Smart Account is derived and prepared for you, laying the foundation for all automated and one-click actions on the platform.",
    imageUrl: "/images/steps/sign-in.png", // Placeholder image for step 1
  },
  {
    title: "02",
    name: "Fund & Delegate",
    icon: CurrencyDollarIcon, // Added Icon

    description:
      "Transfer assets into your new Smart Account. Then, sign a one-time message to create a secure, non-custodial delegation. This grants our automated keeper limited, specific permissions to act on your behalf without ever exposing your keys.[Do a token transfer from your Smart Account to make sure it gets properly Deployed on-chain]",
    imageUrl: "/images/steps/step2.png", // Placeholder image for step 2
  },
  {
    title: "03",
    name: "Optimize Returns",
    icon: ArrowTrendingUpIcon, // Added Icon

    description:
      "Toggle on the automation service to let the keeper rebalance your portfolio for optimal yield. You can also manually perform one-click staking, unstaking, and swaps, all while tracking real-time performance and on-chain activity.",
    imageUrl: "/images/steps/step3.png", // Placeholder image for step 2
  },
  {
    title: "04",
    name: "Sit Back & Relax",
    icon: CheckCircleIcon, // Added Icon for the final step
    // No description or imageUrl for the final step
  },
];

// --- UPDATED Security Pillars ---
const securityPillars = [
  {
    title: "Non-Custodial Asset Control",
    description: "Your assets never leave your Smart Account. You retain 100% ownership and control via your personal MetaMask wallet.",
  },
  {
    title: "Zero Private Key Exposure",
    description: "Your private key never leaves your wallet. All interactions, including login and delegation, are authorized using secure cryptographic signatures.",
  },
  {
    title: "Scoped & Granular Delegation",
    description: "Using MetaMask Delegation, you grant limited, specific permissions to our automated keeper (e.g., 'approve' or 'stake'), never full account access.",
  },
  {
    title: "Secure Authentication (SIWE)",
    description: "We use Sign-In With Ethereum (SIWE) for wallet-based login, ensuring that only you can access your account data and settings.",
  },
  {
    title: "Encrypted Session Management",
    description: "All user sessions are encrypted and managed server-side using Iron Session, protecting your session from hijacking and unauthorized access.",
  },
];
// ---

// --- UPDATED Comparison Data ---
const comparisonData = [
    {
      feature: "Protocol Scope",
      testnet: "Limited to Kintsu & Magma for demonstration",
      mainnet: "Extensible to all high-yield protocols on the network",
    },
    {
      feature: "APY Data Source",
      testnet: "Simulated values for demonstration purposes",
      mainnet: "Live on-chain data from protocols & oracles",
    },
    {
      feature: "Rebalancing Strategy",
      testnet: "Basic 50/50 portfolio ratio balancing",
      mainnet: "Advanced, dynamic rebalancing based on live APY & gas costs",
    },
    {
      feature: "Transaction Model",
      testnet: "Sequential UserOperations (one per action)",
      mainnet: "Atomic batching (e.g., approve + stake in one UserOp)",
    },
    {
      feature: "Gas Fee Management",
      testnet: "Sponsored via Pimlico's Testnet Paymaster",
      mainnet: "User-funded with advanced gas optimization strategies",
    },
  
    {
      feature: "Automation Trigger",
      testnet: "Centralized Vercel Cron Job",
      mainnet: "Decentralized keeper networks (e.g., Chainlink Automation)",
    },
];
// ---
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
            backgroundSize: "64px 64px",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            background: `radial-gradient(ellipse at 30% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(14, 165, 233, 0.1) 0%, transparent 50%)`,
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

          <div className="mx-auto max bg-red-w-6xl">
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as any }}
              >
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/60 bg-blue-500/30 px-4 py-2 backdrop-blur-md text-md font-medium text-blue-200">
                  <div className=" rounded-full">
                    <Image
                      src="/images/tech-metamask.png" // Verify path
                      alt="MetaMask Logo"
                      width={20} // Small size for inline
                      height={20}
                      className="inline-block h-6 w-6 align-middle" // Styling for inline display
                    />
                  </div>
                  <span className="align-middle">MetaMask Smart Accounts</span>
                  <span className="mx-1 align-middle">×</span> {/* Separator */}
                  {/* Monad Logo and Text */}
                  <Image
                    src="/monad-logo.png" // Verify path
                    alt="Monad Logo"
                    width={16}
                    height={16}
                    className="inline-block h-6 w-6 align-middle"
                  />
                  <span className="align-middle">Monad</span>
                </div>
                {/* --- End Modified Badge Div --- */}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.1,
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1] as any,
                }}
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
                Synapse Yield leverages Account Abstraction and MetaMask
                Delegation to automate yield optimization across DeFi protocols
                with institutional-grade security.
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

        {/* ... (Hero Section remains the same) ... */}

        {/* --- Value Proposition --- */}
        <section className="px-4 py-20 md:py-28">
          <div className="mx-auto max-w-7xl">
            {" "}
            {/* Increased max-width slightly */}
            {/* Grid container */}
            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="whileInView"
              className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12 lg:gap-16 items-start" // Adjusted gaps
            >
              {/* Column 1: The Challenge */}
              <motion.div
                variants={fadeInUp}
                // Refined container styling
                className="relative text-center md:text-left p-8 lg:p-10 border-transparent rounded-2xl overflow-hidden
                           bg-gradient-to-b from-slate-900/60 to-slate-950/70 backdrop-blur-lg // Changed gradient direction, slightly increased opacity
                           before:absolute before:inset-0 before:-z-10 before:rounded-2xl
                           before:bg-gradient-to-r before:from-amber-600/25 before:to-red-600/25 // Slightly stronger border gradient
                           before:p-px before:![mask-composite:subtract]
                           before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]
                           shadow-xl shadow-black/30" // Added subtle shadow
              >
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-900/40 px-4 py-2 text-sm font-medium uppercase tracking-wider text-amber-300 ring-1 ring-inset ring-amber-500/30 shadow-inner shadow-amber-950/50">
                  {" "}
                  {/* Adjusted badge style */}
                  <FireIcon className="h-5 w-5" />
                  The Challenge
                </div>
                {/* Slightly larger heading */}
                <h2 className="mb-6 text-3xl font-semibold text-white sm:text-4xl leading-tight">
                  {" "}
                  {/* Adjusted heading size/weight/leading */}
                  DeFi Complexity Hinders Growth
                </h2>
                {/* Increased base text size, adjusted line height */}
                <ul className="space-y-4 text-lg lg:text-xl text-gray-300 leading-relaxed lg:leading-loose">
                  {" "}
                  {/* Adjusted text size/color/leading */}
                  <li className="flex items-start gap-3">
                    <XCircleIcon className="h-6 w-6 text-red-500/80 mt-1 flex-shrink-0" />
                    <span>
                      Manual yield tracking & rebalancing across diverse
                      protocols is inefficient and complex.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircleIcon className="h-6 w-6 text-red-500/80 mt-1 flex-shrink-0" />
                    <span>
                      Executing multiple transactions for DeFi actions wastes
                      time and valuable gas fees.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircleIcon className="h-6 w-6 text-red-500/80 mt-1 flex-shrink-0" />
                    <span>
                      Managing varied interactions increases security risks and
                      operational burdens for users.
                    </span>
                  </li>
                </ul>
              </motion.div>

              {/* Column 2: The Solution */}
              <motion.div
                variants={fadeInUp}
                // Refined container styling
                className="relative text-center md:text-left p-8 lg:p-10 border-transparent rounded-2xl overflow-hidden
                            bg-gradient-to-b from-slate-900/60 to-slate-950/70 backdrop-blur-lg // Changed gradient direction, slightly increased opacity
                            before:absolute before:inset-0 before:-z-10 before:rounded-2xl
                            before:bg-gradient-to-r before:from-cyan-600/25 before:to-blue-600/25 // Slightly stronger border gradient
                            before:p-px before:![mask-composite:subtract]
                            before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]
                            shadow-xl shadow-black/30" // Added subtle shadow
              >
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-cyan-900/40 px-4 py-2 text-sm font-medium uppercase tracking-wider text-cyan-300 ring-1 ring-inset ring-cyan-500/30 shadow-inner shadow-cyan-950/50">
                  {" "}
                  {/* Adjusted badge style */}
                  <SparklesIcon className="h-5 w-5" />
                  Our Solution
                </div>
                {/* Slightly larger heading */}
                <h2 className="mb-6 text-3xl font-semibold text-white sm:text-4xl leading-tight">
                  {" "}
                  {/* Adjusted heading size/weight/leading */}
                  Effortless & Secure Yield
                </h2>
                {/* Increased base text size, adjusted line height */}
                <ul className="space-y-4 text-lg lg:text-xl text-gray-300 leading-relaxed lg:leading-loose">
                  {" "}
                  {/* Adjusted text size/color/leading */}
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon className="h-6 w-6 text-green-500/80 mt-1 flex-shrink-0" />
                    <span>
                      <b>Automated Strategy Execution:</b> Backend agent
                      monitors protocols and executes pre-approved strategies to
                      optimize portfolio balance and yield.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon className="h-6 w-6 text-green-500/80 mt-1 flex-shrink-0" />
                    <span>
                      <b>Non-Custodial Security:</b> Securely delegate limited
                      permissions (stake, swap, approve) via MetaMask
                      Delegation, retaining full asset control.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon className="h-6 w-6 text-green-500/80 mt-1 flex-shrink-0" />
                    <span>
                      <b>Simplified UX (AA):</b> Smart Accounts enable <b>one-click</b> actions, transaction batching, and potential <b>gas savings</b> through paymaster integration.
                    </span>
                  </li>
                </ul>
              </motion.div>
            </motion.div>
          </div>
        </section>
        {/* --- End Value Proposition --- */}

        {/* --- Features Grid with Interactive PNG Icons (Compact) --- */}
        {/* Reduced vertical padding */}
        <section className="px-4 py-16 md:py-20">
          <div className="mx-auto max-w-7xl">
            {/* Section Header */}
            {/* Reduced bottom margin */}
            <motion.div {...fadeInUp} className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                Platform Capabilities
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-gray-400">
                Enterprise-grade infrastructure for automated DeFi yield
                generation
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="whileInView"
              className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  // Reduced card padding from p-8 to p-6
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-slate-900/50 to-slate-950/50 p-6 backdrop-blur-md transition-all duration-300
                             hover:border-white/10 hover:bg-slate-900/70 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1"
                >
                  {/* Gradient glow effect (unchanged) */}
                  <div
                    className={`absolute -inset-px rounded-2xl bg-gradient-to-r ${feature.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-30 blur-2xl -z-10`}
                  />

                  {/* Icon Container - Reduced bottom margin */}
                  <div className="mb-6">
                    {" "}
                    {/* Reduced margin from mb-8 */}
                    {/* Icon container size and effects remain the same */}
                    <div
                      className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-r ${feature.gradient} p-4 shadow-xl shadow-black/20 h-20 w-20 transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl`}
                    >
                      {/* Icon Shine Effect (unchanged) */}
                      <div className="absolute top-0 left-0 h-full w-full rounded-2xl bg-white/10 opacity-50 mix-blend-overlay [mask-image:linear-gradient(to_bottom_right,white,transparent_60%)] transition-opacity duration-300 group-hover:opacity-100" />

                      <Image
                        src={feature.imageUrl}
                        alt={`${feature.title} icon`}
                        width={48}
                        height={48}
                        className="object-contain relative z-10"
                      />
                    </div>
                  </div>

                  {/* Text Content (unchanged) */}
                  <div className="flex flex-col flex-grow">
                    <h3 className="mb-3 text-2xl font-semibold text-white">
                      {feature.title}
                    </h3>
                    <p className="flex-grow text-base leading-relaxed text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
        {/* --- End Features Grid --- */}
        {/* --- Workflow Section with new Timeline Component --- */}
        <section className="py-20 md:py-28 bg-slate-950/20">
          <div className="mx-auto max-w-6xl">
            <motion.div {...fadeInUp} className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                How It Works
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-gray-400">
                Get started with automated yield optimization in three simple
                steps.
              </p>
            </motion.div>

            {/* Use the new Timeline component with updated data */}
            <Timeline data={workflowData} />
          </div>
        </section>
        {/* --- End Workflow Section --- */}

         {/* --- Technology Stack with new Grid Component --- */}
        <section className="relative px-4 py-20 md:py-28">
            <div className="absolute inset-0 -z-10 opacity-30">
              
            </div>
            <div className="mx-auto w-full max-w-7xl space-y-8 px-4">
				<AnimatedContainer className="mx-auto max-w-3xl text-center">
					<h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
						Technology Stack
					</h2>
					<p className="text-gray-400 mt-4 text-lg text-balance">
						Built on a foundation of cutting-edge, secure, and scalable technologies.
					</p>
				</AnimatedContainer>

				<AnimatedContainer
					delay={0.2}
					className="grid grid-cols-1 divide-x divide-y divide-dashed divide-slate-800 border border-dashed border-slate-800 sm:grid-cols-2 lg:grid-cols-3"
				>
					{technologies.map((feature, i) => (
						<FeatureCard key={i} feature={feature} />
					))}
				</AnimatedContainer>
			</div>
        </section>
        {/* --- End Technology Stack --- */}

       
        {/* --- Security Section with Padlock 3D Model --- */}
        <section className="relative px-4 py-20 md:py-28">
          <div className="mx-auto max-w-7xl">
            <motion.div {...fadeInUp} className="mb-16 text-center">
              <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-wider text-purple-400">
                Security First
              </span>
              <h2 className="mb-6 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">Non-Custodial by Design</h2>
              <p className="mx-auto max-w-3xl text-lg text-gray-400">
                Our multi-layered security architecture is built on battle-tested, decentralized principles to ensure you always have complete control over your assets.
              </p>
            </motion.div>

            {/* Reverted to 2-column grid structure */}
            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="whileInView"
              className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16 lg:gap-24 items-center"
            >
              {/* Left Column: 3D Visual */}
              <motion.div variants={fadeInUp} className="flex items-center justify-center h-96 lg:h-full">
                <div className="relative h-full w-full max-w-md rounded-full bg-gradient-to-b from-purple-500/10 to-transparent p-4 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]">
                    <Canvas className="h-full w-full" gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
                        <Suspense fallback={null}>
                    
                            <Padlock3D />
                        </Suspense>
                    </Canvas>
                </div>
              </motion.div>

              {/* Right Column: Security Pillars */}
              <motion.div variants={staggerContainer} className="space-y-6">
                {securityPillars.map((pillar, index) => (
                  <motion.div
                    key={index}
                    variants={fadeInUp}
                    className="flex gap-4 rounded-xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md transition-all duration-300 hover:border-white/10 hover:bg-slate-900/60"
                  >
                    <ShieldCheckIcon className="h-8 w-8 flex-shrink-0 text-emerald-400 mt-1" />
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
          <div className="mx-auto max-w-7xl">
            <motion.div {...fadeInUp} className="mb-16 text-center">
              <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-wider text-amber-400">
                Development Roadmap
              </span>
              <h2 className="mb-6 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                Testnet to Mainnet Evolution
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-gray-400">
                Currently demonstrating core concepts on the Monad Testnet with a clear path to production-grade functionality.
              </p>
            </motion.div>

            {/* New Grid Layout for Comparison */}
            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="whileInView"
              className="grid grid-cols-1 gap-8 lg:grid-cols-2"
            >
              {comparisonData.map((row, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md transition-all duration-300 hover:border-white/10 hover:bg-slate-900/60"
                >
                  <h3 className="text-xl font-semibold text-white mb-6 border-b border-white/10 pb-4">{row.feature}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Testnet Column */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                        <BeakerIcon className="h-5 w-5" />
                        Testnet
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed">{row.testnet}</p>
                    </div>

                    {/* Mainnet Column */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                        <RocketLaunchIcon className="h-5 w-5" />
                        Mainnet
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed">{row.mainnet}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
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
              <p>
                &copy; {new Date().getFullYear()} Synapse Yield
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
