// src/components/common/ExpandingButton.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ExpandingButtonProps {
  icon: React.ReactNode;
  text: string;
  onClick: () => void;
  isHovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

const ExpandingButton: React.FC<ExpandingButtonProps> = ({
  icon,
  text,
  onClick,
  isHovered,
  onHoverStart,
  onHoverEnd,
}) => {
  return (
    <motion.button
      onClick={onClick}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      className="relative flex items-center justify-end h-14 w-[9.5rem] rounded-full cursor-pointer"
      aria-label={text}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {/* Background Track: Expands from right to left */}
      <motion.div
        className="absolute right-0 top-0 h-full bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-full shadow-lg"
        initial={{ width: '3.5rem' }} // Starts as a 56px circle
        animate={{ width: isHovered ? '9.5rem' : '3.5rem' }} // Expands to 152px
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      >
        {/* Subtle Inner Gradient for hover effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/30 to-teal-500/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
        {/* Glow Effect */}
        <motion.div
          className="absolute inset-[-2px] rounded-full bg-gradient-to-r from-blue-500/20 to-teal-500/20 blur-lg -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 0.7 : 0 }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>

      {/* Content Container for Icon and Text */}
      <div className="relative w-full h-full flex items-center justify-end text-white pointer-events-none">
        {/* Icon: Always positioned in the circular part on the right */}
        <div className="absolute right-0 top-0 h-14 w-14 flex items-center justify-center">
          {icon}
        </div>

        {/* Text: Positioned to the left of the icon, fades in */}
        <motion.span
          className="absolute right-[4.5rem] text-sm font-semibold tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          {text}
        </motion.span>
      </div>
    </motion.button>
  );
};

export default ExpandingButton;