"use client";
// GradualBlur — React Bits inspired
// Children render with a staggered blur-to-sharp animation as they enter the viewport.

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";

interface GradualBlurProps {
  children: React.ReactNode;
  className?: string;
  blur?: number;
  duration?: number;
  delay?: number;
  yOffset?: number;
  once?: boolean;
}

export function GradualBlur({
  children,
  className,
  blur = 20,
  duration = 0.7,
  delay = 0,
  yOffset = 24,
  once = true,
}: GradualBlurProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, filter: `blur(${blur}px)`, y: yOffset }}
      animate={
        isInView
          ? { opacity: 1, filter: "blur(0px)", y: 0 }
          : { opacity: 0, filter: `blur(${blur}px)`, y: yOffset }
      }
      transition={{ duration, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

// Multi-item staggered variant
interface GradualBlurGroupProps {
  items: React.ReactNode[];
  className?: string;
  itemClassName?: string;
  staggerDelay?: number;
  blur?: number;
  duration?: number;
}

export function GradualBlurGroup({
  items,
  className,
  itemClassName,
  staggerDelay = 0.1,
  blur = 16,
  duration = 0.6,
}: GradualBlurGroupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <div ref={ref} className={cn(className)}>
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, filter: `blur(${blur}px)`, y: 20 }}
          animate={
            isInView
              ? { opacity: 1, filter: "blur(0px)", y: 0 }
              : { opacity: 0, filter: `blur(${blur}px)`, y: 20 }
          }
          transition={{
            duration,
            delay: i * staggerDelay,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className={cn(itemClassName)}
        >
          {item}
        </motion.div>
      ))}
    </div>
  );
}
