// src/components/layout/LiquidBackground.tsx
import React from 'react';

interface LiquidBackgroundProps {
  children: React.ReactNode;
}

/**
 * The definitive, professional background for the "Liquid Synapse" theme.
 * This version uses a layered grid system and a heavily subdued aurora for a
 * clean, technical, and premium feel.
 */
const LiquidBackground: React.FC<LiquidBackgroundProps> = ({ children }) => {
  const primaryGridColor = 'rgba(55, 65, 81, 0.4)'; // A visible but subtle grid (slate-600 @ 40%)
  const secondaryGridColor = 'rgba(55, 65, 81, 0.2)'; // A fainter grid for the larger pattern

  return (
    // Base dark navy/charcoal background
    <div className="relative min-h-screen w-full overflow-hidden bg-[#05070D] text-white">
      
      {/* Layer 1: Soft Animated "Aurora" Gradient - Heavily subdued */}
      <div
        className="absolute inset-0 z-0 opacity-[0.15] bg-animation"
        style={{
          backgroundImage: `
            radial-gradient(at 27% 37%, hsla(215, 98%, 61%, 1) 0px, transparent 50%),
            radial-gradient(at 97% 21%, hsla(190, 95%, 68%, 1) 0px, transparent 50%),
            radial-gradient(at 52% 99%, hsla(320, 100%, 70%, 1) 0px, transparent 50%),
            radial-gradient(at 10% 29%, hsla(256, 96%, 68%, 1) 0px, transparent 50%),
            radial-gradient(at 97% 96%, hsla(222, 90%, 75%, 1) 0px, transparent 50%),
            radial-gradient(at 33% 50%, hsla(240, 98%, 61%, 0.8) 0px, transparent 50%),
            radial-gradient(at 79% 53%, hsla(280, 90%, 70%, 1) 0px, transparent 50%)
          `,
          backgroundSize: '200% 200%',
        }}
        aria-hidden="true"
      />

      {/* Layer 2: Layered Grid Pattern with fade-out mask */}
      <div
        className="absolute inset-0 z-[1] opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(to right, ${primaryGridColor} 1px, transparent 1px),
            linear-gradient(to bottom, ${primaryGridColor} 1px, transparent 1px),
            linear-gradient(to right, ${secondaryGridColor} 1px, transparent 1px),
            linear-gradient(to bottom, ${secondaryGridColor} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px, 120px 120px', // Small grid and large grid
          maskImage: 'radial-gradient(ellipse at center, white 15%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, white 15%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Layer 3: Vignette to darken edges */}
      <div 
        className="absolute inset-0 z-[2] bg-gradient-radial from-transparent to-[#05070D]/80"
        aria-hidden="true"
      />
      
      {/* Layer 4: Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default LiquidBackground;

