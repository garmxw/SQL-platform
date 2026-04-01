"use client";
// FlowingMenu — React Bits inspired
// Fullwidth menu items with a flowing marquee text effect on hover.

import { useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

interface FlowingMenuItemProps {
  text: string;
  tag?: string;
  href?: string;
  marqueePhrases?: string[];
}

interface FlowingMenuProps {
  items: FlowingMenuItemProps[];
  className?: string;
}

function FlowingMenuItem({
  text,
  tag,
  href = "#",
  marqueePhrases,
}: FlowingMenuItemProps) {
  const containerRef = useRef<HTMLAnchorElement>(null);
  const progress = useMotionValue(0);
  const marqueeX = useTransform(progress, [0, 1], ["0%", "-50%"]);

  const phrases = marqueePhrases ?? [
    text,
    "→",
    text,
    "→",
    text,
    "→",
    text,
    "→",
  ];
  const marqueeText = phrases.join("   ");

  const handleMouseEnter = () => {
    animate(progress, 1, { duration: 0.4, ease: "easeOut" });
  };
  const handleMouseLeave = () => {
    animate(progress, 0, { duration: 0.3, ease: "easeIn" });
  };

  return (
    <a
      ref={containerRef}
      href={href}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative flex items-center border-b border-border overflow-hidden cursor-pointer select-none"
      style={{ height: "clamp(4rem, 8vw, 7rem)" }}
    >
      {/* Sliding background fill */}
      <motion.div
        className="absolute inset-0 bg-foreground origin-left"
        style={{ scaleX: progress }}
        transition={{ duration: 0 }}
      />

      {/* Static label — fades out on hover */}
      <motion.div
        className="relative z-10 flex items-center justify-between w-full px-8 lg:px-16"
        style={{ opacity: useTransform(progress, [0, 0.5], [1, 0]) }}
      >
        <span
          className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-foreground"
          style={{ fontFamily: "'Sora', 'Syne', sans-serif" }}
        >
          {text}
        </span>
        <div className="flex items-center gap-3">
          {tag && (
            <span className="text-xs  text-muted-foreground border border-border rounded-full px-3 py-1 hidden sm:block">
              {tag}
            </span>
          )}
          <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </motion.div>

      {/* Marquee — slides in on hover */}
      <motion.div
        className="absolute inset-0 z-10 flex items-center overflow-hidden"
        style={{ opacity: useTransform(progress, [0.4, 1], [0, 1]) }}
      >
        <motion.div
          className="flex whitespace-nowrap"
          style={{ x: marqueeX }}
          animate={{ x: ["-0%", "-50%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        >
          {[...Array(4)].map((_, i) => (
            <span
              key={i}
              className="px-8 text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-background"
              style={{ fontFamily: "'Sora', 'Syne', sans-serif" }}
            >
              {marqueeText}
            </span>
          ))}
        </motion.div>
      </motion.div>
    </a>
  );
}

export function FlowingMenu({ items, className }: FlowingMenuProps) {
  return (
    <div className={cn("w-full border-t border-border", className)}>
      {items.map((item, i) => (
        <FlowingMenuItem key={i} {...item} />
      ))}
    </div>
  );
}
