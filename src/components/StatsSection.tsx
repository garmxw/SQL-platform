"use client";
// ─────────────────────────────────────────────────────────────────────────────
// StatsSection  ·  Vorn landing page
// Separable: import { StatsSection } from "@/components/sections/stats-section"
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useEffect, useState } from "react";
import { useInView } from "motion/react";
import { GradualBlur } from "@/components/GradualBlur";
import { Separator } from "@/components/ui/separator";

interface StatItem {
  value: number;
  suffix?: string;
  label: string;
  desc: string;
}

const STATS: StatItem[] = [
  {
    value: 2400,
    suffix: "+",
    label: "Learners",
    desc: "Students sharpening SQL skills on Vorn.",
  },
  {
    value: 200,
    suffix: "+",
    label: "Problems",
    desc: "Curated SQL challenges across all difficulty levels.",
  },
  {
    value: 4,
    suffix: "",
    label: "Learning Tracks",
    desc: "Foundations → Joins → Aggregations → Windows.",
  },
  {
    value: 98,
    suffix: "%",
    label: "Satisfaction",
    desc: "Based on learner-reported feedback after completing a track.",
  },
];

function AnimatedNumber({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1200;
    const step = 16;
    const increment = (value / duration) * step;

    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else setDisplay(Math.floor(start));
    }, step);

    return () => clearInterval(timer);
  }, [isInView, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

export function StatsSection() {
  return (
    <section
      id="community"
      className="py-24 lg:py-32 border-y border-border bg-muted/20"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <GradualBlur className="text-center mb-16">
          <h2
            className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
            style={{ fontFamily: "'Sora','Syne',sans-serif" }}
          >
            Built for serious learners.
          </h2>
          <p
            className="text-muted-foreground text-lg max-w-lg mx-auto"
            style={{ fontFamily: "'Inter',sans-serif" }}
          >
            Vorn isn't a quiz app. It's a full practice environment where every
            solved problem moves you forward.
          </p>
        </GradualBlur>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 rounded-xl border border-border overflow-hidden">
          {STATS.map((stat, i) => (
            <GradualBlur
              key={stat.label}
              delay={i * 0.1}
              className={`p-8 flex flex-col gap-2 bg-card ${i < STATS.length - 1 ? "border-r border-border" : ""}`}
            >
              <span
                className="text-5xl font-bold tracking-tight"
                style={{ fontFamily: "'Sora','Syne',sans-serif" }}
              >
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </span>
              <span
                className="text-base font-semibold"
                style={{ fontFamily: "'Inter',sans-serif" }}
              >
                {stat.label}
              </span>
              <p
                className="text-sm text-muted-foreground leading-relaxed"
                style={{ fontFamily: "'Inter',sans-serif" }}
              >
                {stat.desc}
              </p>
            </GradualBlur>
          ))}
        </div>
      </div>
    </section>
  );
}
