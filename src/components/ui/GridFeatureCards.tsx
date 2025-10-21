"use client";

import { cn } from '@/lib/utils';
import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';

// --- Type Definitions ---
interface Feature {
    title: string;
    icon: string;
    description: string;
}

interface FeatureCardProps extends Omit<React.ComponentProps<'div'>, 'children'> {
    feature: Feature;
}

interface GridPatternProps extends React.ComponentPropsWithoutRef<'svg'> {
    width: number;
    height: number;
    x: string;
    y: string;
    squares?: readonly [number, number][];
}

interface AnimatedContainerProps {
    delay?: number;
    className?: string;
    children: React.ReactNode;
}

// --- Main FeatureCard Component ---
export function FeatureCard({ feature, className, ...props }: FeatureCardProps) {
    // Initialize with null to match server-side render
    const [patternSquares, setPatternSquares] = useState<readonly [number, number][] | null>(null);

    // Generate random pattern only on client after hydration
    useEffect(() => {
        setPatternSquares(generateRandomPattern());
    }, []);

    return (
        <div 
            className={cn('relative overflow-hidden p-6 md:p-8', className)} 
            {...props}
        >
            {/* Background Pattern Layer */}
            <div className="pointer-events-none absolute inset-0 left-1/2 -mt-2 -ml-20 [mask-image:linear-gradient(white,transparent)]">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-800/20 to-slate-900/10 opacity-100 [mask-image:radial-gradient(farthest-side_at_top,white,transparent)]">
                    <GridPattern
                        width={20}
                        height={20}
                        x="-12"
                        y="4"
                        squares={patternSquares ?? []}
                        className="absolute inset-0 h-full w-full fill-slate-800/50 stroke-slate-700/80 mix-blend-overlay"
                        aria-hidden="true"
                    />
                </div>
            </div>

            {/* Icon Container */}
            <div className="relative h-12 w-12 rounded-sm">
                <Image
                    src={feature.icon}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-contain"
                />
            </div>

            {/* Content */}
            <div className="relative z-10">
                <h3 className="mt-8 text-lg font-semibold text-white">
                    {feature.title}
                </h3>
                <p className="mt-2 text-sm font-light text-gray-400">
                    {feature.description}
                </p>
            </div>
        </div>
    );
}

// --- GridPattern SVG Component ---
function GridPattern({
    width,
    height,
    x,
    y,
    squares = [],
    className,
    ...props
}: GridPatternProps) {
    const patternId = React.useId();

    return (
        <svg aria-hidden="true" className={className} {...props}>
            <defs>
                <pattern 
                    id={patternId} 
                    width={width} 
                    height={height} 
                    patternUnits="userSpaceOnUse" 
                    x={x} 
                    y={y}
                >
                    <path d={`M.5 ${height}V.5H${width}`} fill="none" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${patternId})`} />
            {squares.length > 0 && (
                <svg x={x} y={y} className="overflow-visible">
                    {squares.map(([squareX, squareY], index) => (
                        <rect 
                            key={`${squareX}-${squareY}-${index}`}
                            strokeWidth="0" 
                            width={width + 1} 
                            height={height + 1} 
                            x={squareX * width} 
                            y={squareY * height} 
                        />
                    ))}
                </svg>
            )}
        </svg>
    );
}

// --- Animation Wrapper Component ---
export function AnimatedContainer({ 
    className, 
    delay = 0.1, 
    children 
}: AnimatedContainerProps) {
    const shouldReduceMotion = useReducedMotion();

    if (shouldReduceMotion) {
        return <div className={className}>{children}</div>;
    }

    return (
        <motion.div
            initial={{ 
                filter: 'blur(4px)', 
                y: -8, 
                opacity: 0 
            }}
            whileInView={{ 
                filter: 'blur(0px)', 
                y: 0, 
                opacity: 1 
            }}
            viewport={{ 
                once: true, 
                amount: 0.2,
                margin: "0px 0px -50px 0px"
            }}
            transition={{ 
                delay, 
                duration: 0.8,
                ease: [0.25, 0.1, 0.25, 1]
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// --- Helper Function ---
function generateRandomPattern(length = 5): readonly [number, number][] {
    return Array.from({ length }, () => [
        Math.floor(Math.random() * 4) + 7,
        Math.floor(Math.random() * 6) + 1,
    ] as const);
}
