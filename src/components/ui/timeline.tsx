"use client";
import {
  useScroll,
  useTransform,
  motion,
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

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const lastItem = ref.current.querySelector('.timeline-item:last-child');
      if (lastItem) {
        const lastItemRect = lastItem.getBoundingClientRect();
        // Calculate height to stop at the center of the last dot
        setHeight(lastItemRect.top - rect.top + lastItemRect.height / 2);
      } else {
        setHeight(rect.height);
      }
    }
  }, [ref, data]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 5%", "end 70%"],
  });

const speedFactor = 1.5;
const fastProgress = useTransform(scrollYProgress, (v) => Math.pow(v, 0.8));
const heightTransform = useTransform(
  scrollYProgress,
  [0, 1],
  [0, Math.min(height * speedFactor, height)]
);  const opacityTransform = useTransform(scrollYProgress, [0, 0.05], [0, 1]);

  return (
    <div
      className="w-full font-sans md:px-10"
      ref={containerRef}
    >
      <div ref={ref} className="relative max-w-7xl mx-auto pb-20">
        {/* The static line behind the animation */}
        <div
          // This div creates the full-length gray line
          className="absolute md:left-8 left-8 top-0 overflow-hidden w-[2px] bg-slate-700"
          style={{ height: `${height}px` }}
        >
            {/* The animated, colored line that draws on top */}
            <motion.div
              style={{
                height: heightTransform,
                opacity: opacityTransform,
              }}
              className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"
            />
        </div>

        {data.map((item, index) => {
          // Define a threshold point for when the icon should appear, slightly before the center
          const activationPoint = (index / data.length) + (0.5 / (data.length * 2));
          
          // Animate scale and opacity based on the scroll progress passing the activation point
          const dotScale = useTransform(scrollYProgress, [activationPoint - 0.08, activationPoint], [1, 0]);
          const iconScale = useTransform(scrollYProgress, [activationPoint - 0.08, activationPoint], [0, 1]);
          const iconOpacity = useTransform(scrollYProgress, [activationPoint - 0.08, activationPoint], [0, 1]);
          
          // Text color change when dot is connected
          const textOpacity = useTransform(scrollYProgress, [activationPoint - 0.08, activationPoint], [0, 1]);


          return (
            <div
              key={index}
              className="timeline-item flex justify-start pt-10 md:pt-24 md:gap-10"
            >
              {/* Sticky Title and Dot (Left side on desktop) */}
              <div className="sticky flex flex-col z-10 items-center top-[70vh] self-start max-w-xs lg:max-w-sm md:w-full">
                {/* FIX: Removed conflicting `relative` class from previous versions. */}
                <div className="h-12 absolute left-2 md:left-2 w-12 flex items-center justify-center">
                    {/* The static outer ring of the dot */}
                    <div className="absolute h-full w-full rounded-full bg-slate-900 ring-2 ring-slate-700" />
                    
                    {/* The inner dot that fades away */}
                    <motion.div 
                        className="h-3 w-3 rounded-full bg-slate-500" 
                        style={{ scale: dotScale }}
                    />
                    
                    {/* The animated icon that fades in */}
                    <motion.div
                        style={{ scale: iconScale, opacity: iconOpacity }}
                        className="absolute h-full w-full flex items-center justify-center"
                    >
                        {React.createElement(item.icon, { className: "h-6 w-6 text-cyan-400" })}
                    </motion.div>
                </div>
                <div className="hidden md:block md:pl-20 text-left">
                    <motion.h3 
                      className="text-5xl lg:text-6xl font-bold"
                      style={{
                        color: useTransform(
                          textOpacity,
                          [0, 1],
                          ['rgb(71, 85, 105)', 'rgb(103, 232, 249)']
                        ),
                        textShadow: useTransform(
                          textOpacity,
                          [0, 1],
                          ['0 0 0px rgba(103, 232, 249, 0)', '0 0 30px rgba(103, 232, 249, 0.8)']
                        )
                      }}
                    >
                      {item.title}
                    </motion.h3>
                    <motion.p 
                      className="mt-2 text-xl font-medium"
                      style={{
                        color: useTransform(
                          textOpacity,
                          [0, 1],
                          ['rgb(148, 163, 184)', 'rgb(165, 243, 252)']
                        ),
                        textShadow: useTransform(
                          textOpacity,
                          [0, 1],
                          ['0 0 0px rgba(103, 232, 249, 0)', '0 0 20px rgba(103, 232, 249, 0.6)']
                        )
                      }}
                    >
                      {item.name}
                    </motion.p>
                </div>
              </div>

              {/* Content (Right side on desktop) */}
              <div className="relative pl-20 pr-4 md:pl-4 w-full">
                <div className="md:hidden mb-6">
                  <h3 className="text-3xl font-bold text-slate-500">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-lg font-medium text-slate-400">{item.name}</p>
                </div>
                {item.description && item.imageUrl ? (
                    <div className="space-y-6">
                        <p className="text-lg text-gray-300 leading-relaxed">
                            {item.description}
                        </p>
                        <div className="relative overflow-hidden rounded-xl border border-white/10 shadow-lg shadow-black/30">
                           <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                           <Image
                              src={item.imageUrl}
                              // FIX: This resolves the TypeScript error by providing a simple string.
                              alt={item.name}
                              width={1200}
                              height={794}
                              className="w-full h-auto object-cover"
                            />
                        </div>
                    </div>
                 ) : (
                    // Placeholder for the last item with no content
                    <div className="h-40"></div>
                 )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};