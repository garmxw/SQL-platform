"use client";
// ─────────────────────────────────────────────────────────────────────────────
// TracksSection  ·  Vorn landing page
// Separable: import { TracksSection } from "@/components/sections/tracks-section"
// ─────────────────────────────────────────────────────────────────────────────

import { GradualBlur } from "@/components/GradualBlur";
import { FlowingMenu } from "@/components/FlowingMenu";
import { Badge } from "@/components/ui/badge";

const TRACKS = [
  {
    text: "SQL Foundations",
    tag: "Beginner · 6 lessons",
    href: "/tracks/foundations",
    marqueePhrases: [
      "SQL Foundations",
      "·",
      "SELECT",
      "FROM",
      "WHERE",
      "ORDER BY",
      "LIMIT",
    ],
  },
  {
    text: "Joins & Relationships",
    tag: "Intermediate · 6 lessons",
    href: "/tracks/joins",
    marqueePhrases: [
      "Joins & Relationships",
      "·",
      "INNER JOIN",
      "LEFT JOIN",
      "SELF JOIN",
      "N+1 Problems",
    ],
  },
  {
    text: "Aggregations & Grouping",
    tag: "Intermediate · 5 lessons",
    href: "/tracks/aggregations",
    marqueePhrases: [
      "Aggregations",
      "·",
      "GROUP BY",
      "HAVING",
      "COUNT",
      "SUM",
      "AVG",
      "ROLLUP",
    ],
  },
  {
    text: "Window Functions",
    tag: "Advanced · 6 lessons",
    href: "/tracks/window-functions",
    marqueePhrases: [
      "Window Functions",
      "·",
      "DENSE_RANK",
      "PARTITION BY",
      "LAG",
      "LEAD",
      "ROW_NUMBER",
    ],
  },
  {
    text: "Query Optimization",
    tag: "Advanced · 4 lessons",
    href: "/tracks/optimization",
    marqueePhrases: [
      "Query Optimization",
      "·",
      "EXPLAIN",
      "Indexes",
      "Execution Plan",
      "Profiling",
    ],
  },
];

export function TracksSection() {
  return (
    <section id="tracks" className="py-24 lg:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <GradualBlur className="mb-12">
          <Badge variant="outline" className="mb-4 text-xs ">
            Learning Tracks
          </Badge>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <h2
              className="text-4xl md:text-5xl font-bold tracking-tight max-w-lg"
              style={{ fontFamily: "'Sora','Syne',sans-serif" }}
            >
              Structured paths from zero to expert.
            </h2>
            <p
              className="text-muted-foreground text-base max-w-xs leading-relaxed md:text-right"
              style={{ fontFamily: "'Inter',sans-serif" }}
            >
              Each track unlocks the next.
              <br />
              Every lesson has a problem attached.
            </p>
          </div>
        </GradualBlur>

        {/* Flowing menu */}
        <GradualBlur delay={0.2}>
          <FlowingMenu items={TRACKS} />
        </GradualBlur>
      </div>
    </section>
  );
}
