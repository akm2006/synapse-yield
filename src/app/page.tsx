'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import SmartAccountManager from './components/SmartAccountManager';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <div className="flex flex-col items-center text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Synapse Yield</h1>
        <p className="text-lg text-gray-600 mb-8">Your autonomous agent for yield optimization.</p>
        
        {/* RainbowKit's Button handles wallet connection */}
        <ConnectButton />

        {/* Our custom component handles Smart Account logic */}
        <SmartAccountManager />
      </div>
    </main>
  );
}