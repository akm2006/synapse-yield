"use client";
import {
  useScroll,
  useTransform,
  motion,
  useSpring,
} from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

// The interface for each entry in the timeline
export interface TimelineEntry {
  title: string;
  name: string;
  icon: React.ElementType;
  description?: string;
  imageUrl?: string;
}

// The main Timeline component
export const Timeline = ({ data }: { data: TimelineEntry[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const lastItem = ref.current.querySelector('.timeline-item:last-child');
      if (lastItem) {
        const lastItemRect = lastItem.getBoundingClientRect();
        setHeight(lastItemRect.top - rect.top + lastItemRect.height / 2);
      } else {
        setHeight(rect.height);
      }
    }
  }, [ref, data]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 80%"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const heightTransform = useTransform(
    smoothProgress,
    [0, 1],
    [0, height]
  );
  
  const opacityTransform = useTransform(smoothProgress, [0, 0.05], [0, 1]);

  return (
    <div
      className="w-full font-sans px-4 md:px-10"
      ref={containerRef}
    >
      <div ref={ref} className="relative max-w-7xl mx-auto pb-20">
        {/* The static line behind the animation */}
        <div
          className="absolute left-6 md:left-8 top-0 overflow-hidden w-[3px] md:w-[2px] bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 rounded-full"
          style={{ height: `${height}px` }}
        >
          {/* The animated, colored line that draws on top */}
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0 w-[3px] md:w-[2px] bg-gradient-to-b from-cyan-400 via-blue-500 to-purple-600 rounded-full shadow-lg shadow-cyan-500/50"
          />
        </div>

        {data.map((item, index) => {
          const activationPoint = (index / data.length) + (0.5 / (data.length * 2));
          
          const dotScale = useTransform(smoothProgress, [activationPoint - 0.1, activationPoint], [1, 0]);
          const iconScale = useTransform(smoothProgress, [activationPoint - 0.1, activationPoint], [0, 1]);
          const iconOpacity = useTransform(smoothProgress, [activationPoint - 0.1, activationPoint], [0, 1]);
          const iconRotate = useTransform(smoothProgress, [activationPoint - 0.1, activationPoint], [180, 0]);
          
          const textOpacity = useTransform(smoothProgress, [activationPoint - 0.1, activationPoint], [0, 1]);
          const contentOpacity = useTransform(smoothProgress, [activationPoint - 0.15, activationPoint + 0.05], [0.3, 1]);
          const contentY = useTransform(smoothProgress, [activationPoint - 0.15, activationPoint + 0.05], [50, 0]);

          return (
            <div
              key={index}
              className="timeline-item flex justify-start pt-16 md:pt-32 md:gap-10"
            >
              {/* Dot and Title Section */}
              <div className="sticky flex flex-col md:flex-row z-10 items-start md:items-center top-[40vh] md:top-[50vh] self-start max-w-xs lg:max-w-sm md:w-full">
                {/* Dot Container */}
                <div className="h-14 w-14 md:h-12 md:w-12 absolute left-0 md:left-2 flex items-center justify-center -ml-1 md:ml-0">
                  {/* Pulsing outer glow */}
                  <motion.div 
                    className="absolute h-full w-full rounded-full bg-cyan-500/20"
                    style={{ 
                      scale: useTransform(iconOpacity, [0, 1], [1, 1.5]),
                      opacity: useTransform(iconOpacity, [0, 1], [0, 0.5])
                    }}
                  />
                  
                  {/* Static outer ring */}
                  <div className="absolute h-full w-full rounded-full bg-gradient-to-br from-slate-800 to-slate-900 ring-2 ring-slate-600 shadow-lg" />
                  
                  {/* Inner dot that shrinks */}
                  <motion.div 
                    className="h-4 w-4 md:h-3 md:w-3 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 shadow-inner" 
                    style={{ scale: dotScale }}
                  />
                  
                  {/* Animated icon */}
                  <motion.div
                    style={{ 
                      scale: iconScale, 
                      opacity: iconOpacity,
                      rotate: iconRotate
                    }}
                    className="absolute h-full w-full flex items-center justify-center"
                  >
                    {React.createElement(item.icon, { 
                      className: "h-7 w-7 md:h-6 md:w-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(103,232,249,0.8)]" 
                    })}
                  </motion.div>
                </div>
                
                {/* Title - Hidden on mobile, shown on desktop */}
                <div className="hidden md:block md:pl-20 text-left">
                  <motion.h3 
                    className="text-4xl lg:text-6xl font-bold tracking-tight"
                    style={{
                      color: useTransform(
                        textOpacity,
                        [0, 1],
                        ['rgb(71, 85, 105)', 'rgb(103, 232, 249)']
                      ),
                      textShadow: useTransform(
                        textOpacity,
                        [0, 1],
                        ['0 0 0px rgba(103, 232, 249, 0)', '0 0 40px rgba(103, 232, 249, 0.6)']
                      )
                    }}
                  >
                    {item.title}
                  </motion.h3>
                  <motion.p 
                    className="mt-2 text-lg lg:text-xl font-medium tracking-wide"
                    style={{
                      color: useTransform(
                        textOpacity,
                        [0, 1],
                        ['rgb(148, 163, 184)', 'rgb(165, 243, 252)']
                      ),
                      textShadow: useTransform(
                        textOpacity,
                        [0, 1],
                        ['0 0 0px rgba(103, 232, 249, 0)', '0 0 25px rgba(103, 232, 249, 0.4)']
                      )
                    }}
                  >
                    {item.name}
                  </motion.p>
                </div>
              </div>

              {/* Content Section */}
              <motion.div 
                className="relative pl-16 md:pl-4 pr-4 md:pr-0 w-full"
                style={{
                  opacity: contentOpacity,
                  y: isMobile ? 0 : contentY
                }}
              >
                {/* Mobile Title */}
                <div className="md:hidden mb-6">
                  <h3 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-base sm:text-lg font-medium text-cyan-300/80">
                    {item.name}
                  </p>
                </div>
                
                {item.description && item.imageUrl ? (
                  <div className="space-y-6">
                    <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
                      {item.description}
                    </p>
                    <motion.div 
                      className="relative overflow-hidden rounded-xl border border-cyan-500/20 shadow-2xl shadow-black/50 group"
                      whileHover={{ scale: isMobile ? 1 : 1.02 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        width={1200}
                        height={800}
                        className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </motion.div>
                  </div>
                ) : (
                  <div className="h-32 md:h-40"></div>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
};