import { ActivityFeed } from "@/components/ActivityFeed";
import Header from "@/components/Header";
import {Database } from 'lucide-react';
import Image from "next/image";

const TechLogo = ({ name, src, href }: { name: string, src: string, href: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="group flex items-center gap-3 transition-opacity hover:opacity-100 opacity-75"
  >
   <Image
  src={src}
  alt={`${name} logo`}
  width={32} // Add appropriate width
  height={32} // Add appropriate height
  className="h-8 w-8 object-contain transition-all duration-300 group-hover:grayscale-0 grayscale"
/>
    <span className="text-sm font-semibold text-gray-300 group-hover:text-white">{name}</span>
  </a>
);

export default function ActivityFeedPage() {
  return (
    <main className="relative pt-10 min-h-screen w-full overflow-x-hidden bg-gray-950 text-white">
    <Header/>
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(200, 200, 220, 0.5) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(200, 200, 220, 0.5) 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
        }}
      />

      {/* Animated Gradient Background */}
      <div
        className="absolute inset-0 z-[1] opacity-30 bg-animation"
        style={{
          backgroundImage: `radial-gradient(at 27% 37%, hsla(215, 98%, 61%, 1) 0px, transparent 50%),
                          radial-gradient(at 97% 21%, hsla(190, 95%, 68%, 1) 0px, transparent 50%),
                          radial-gradient(at 52% 99%, hsla(320, 100%, 70%, 1) 0px, transparent 50%),
                          radial-gradient(at 10% 29%, hsla(256, 96%, 68%, 1) 0px, transparent 50%),
                          radial-gradient(at 97% 96%, hsla(222, 90%, 75%, 1) 0px, transparent 50%),
                          radial-gradient(at 33% 50%, hsla(240, 98%, 61%, 0.8) 0px, transparent 50%),
                          radial-gradient(at 79% 53%, hsla(280, 90%, 70%, 1) 0px, transparent 50%)`,
          backgroundSize: '200% 200%',
        }}
      />

      {/* Vignette effect to focus the center */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-t from-gray-950 via-transparent to-gray-950/50" />
      <div className="absolute inset-0 z-[2] bg-gradient-to-r from-gray-950 via-transparent to-gray-950" />

      {/* Content Wrapper */}
      <div className="relative z-10 flex flex-col items-center justify-between min-h-screen p-4 md:p-8">
        <header className="w-full max-w-4xl pt-8 md:pt-16 text-center">
          <div className="flex items-center justify-center gap-3 text-sm font-medium text-blue-300 bg-blue-900/30 border border-blue-800/50 rounded-full px-4 py-1.5 mb-4 max-w-xs mx-auto">
            <Database className="w-4 h-4" />
            <span>Real-time Data Indexed by Envio</span>
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400"
            style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)' }}
          >
            Live On-Chain Activity
          </h1>
          <p className="mt-4 text-base md:text-lg text-gray-400 max-w-3xl mx-auto">
            This feed displays recent public staking events from Kintsu & Magma and gMON/sMON swaps on PancakeSwap, along with all automated rebalance transactions from the Synapse Yield agent.
          </p>
        </header>

        <div className="w-full py-8">
          <ActivityFeed />
        </div>

        <footer className="w-full max-w-4xl pb-8 text-center text-gray-500 text-sm">
          <div className="border-t border-gray-800/50 my-6"></div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <TechLogo
              name="Powered by Monad"
              src="https://i0.wp.com/www.gizmotimes.com/wp-content/uploads/2023/10/Monad-Logo.png?fit=1920%2C1080&ssl=1"
              href="https://www.monad.xyz/"
            />
            <TechLogo
              name="Indexed by Envio"
              src="https://avatars.githubusercontent.com/u/135992464?s=280&v=4"
              href="https://envio.dev/"
            />
          </div>
          <p className="mt-6 text-xs text-gray-600">Last updated: October 2025</p>
        </footer>
      </div>
    </main>
  );
}

