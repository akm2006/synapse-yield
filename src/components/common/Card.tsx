// src/components/common/Card.tsx
'use client';

import { motion, useMotionValue, useSpring, Variants } from 'framer-motion';
import React, { useRef } from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
  variants?: Variants;
  delay?: number;
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay,
      duration: 0.5,
      ease: 'easeOut',
    },
  }),
};

/**
 * The final, balanced card component for the "Liquid Synapse" theme.
 * Blends a subtle static inner glow, a dynamic mouse-aware spotlight, 
 * and a refined outer glow on hover for a professional and unique feel.
 */
const Card: React.FC<CardProps> = ({
  children,
  className = '',
  as: Component = 'div',
  variants = cardVariants,
  delay = 0,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const mouseX = useSpring(0, { stiffness: 400, damping: 40 });
  const mouseY = useSpring(0, { stiffness: 400, damping: 40 });

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    if (!currentTarget) return;
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={onMouseMove}
      variants={variants}
      custom={delay}
      initial="hidden"
      animate="visible"
      className="group relative w-full"
    >
      {/* Animated Outer Glow on Hover */}
      <div
        className="
          absolute -inset-1 rounded-2xl 
          bg-gradient-to-r from-cyan-500/80 via-blue-500/80 to-purple-500/80 
          opacity-0 group-hover:opacity-30 
          transition-opacity duration-300
          blur-lg
        "
        aria-hidden="true"
      />
      
      {/* Main Card Container */}
      <Component
        className={`
          relative w-full h-full
          bg-slate-900/70 backdrop-blur-xl
          border border-white/10
          rounded-2xl
          p-6
          shadow-2xl shadow-black/50
          transition-colors duration-300
          overflow-hidden
          ${className}
        `}
      >
        {/* Mouse-Aware Spotlight */}
        <motion.div
            className="
            pointer-events-none
            absolute
            -inset-px
            rounded-2xl
            opacity-0
            transition-opacity
            duration-300
            group-hover:opacity-100
            "
            style={{
            background: `
                radial-gradient(
                350px circle at ${mouseX}px ${mouseY}px,
                rgba(0, 180, 219, 0.1),
                transparent 80%
                )
            `,
            }}
            aria-hidden="true"
        />

        {/* Static Inner Glow Border (always visible) */}
        <div 
          className="absolute inset-0 border border-transparent rounded-2xl pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 15px rgba(0, 180, 219, 0.08)'
          }}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </Component>
    </motion.div>
  );
};

export default Card;

