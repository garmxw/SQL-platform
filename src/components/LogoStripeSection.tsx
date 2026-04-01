"use client";
// ─────────────────────────────────────────────────────────────────────────────
// LogoStripSection  ·  Vorn landing page
// Separable: import { LogoStripSection } from "@/components/sections/logo-strip-section"
// ─────────────────────────────────────────────────────────────────────────────

import { InfiniteSlider } from "@/components/InfiniteSlider";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";

const SQL_TOOLS = [
  {
    name: "PostgreSQL",
    logo: "https://raw.githubusercontent.com/devicons/devicon/master/icons/postgresql/postgresql-original.svg",
  },
  {
    name: "MySQL",
    logo: "https://raw.githubusercontent.com/devicons/devicon/master/icons/mysql/mysql-original.svg",
  },
  {
    name: "SQLite",
    logo: "https://raw.githubusercontent.com/devicons/devicon/master/icons/sqlite/sqlite-original.svg",
  },
  {
    name: "MongoDB",
    logo: "https://raw.githubusercontent.com/devicons/devicon/master/icons/mongodb/mongodb-original.svg",
  },
  {
    name: "Redis",
    logo: "https://raw.githubusercontent.com/devicons/devicon/master/icons/redis/redis-original.svg",
  },
  {
    name: "Supabase",
    logo: "https://raw.githubusercontent.com/devicons/devicon/master/icons/supabase/supabase-original.svg",
  },
  {
    name: "PlanetScale",
    logo: "https://avatars.githubusercontent.com/u/64210738?s=48",
  },
  {
    name: "Neon",
    logo: "https://avatars.githubusercontent.com/u/77690634?s=48",
  },
];

export function LogoStripSection() {
  return (
    <section className="bg-background py-4 border-y border-border">
      <div className="group relative max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="md:max-w-40 md:border-r md:border-border md:pr-6 shrink-0">
            <p
              className="text-sm text-muted-foreground text-center md:text-right font-bold"
              style={{ fontFamily: "'Inter',sans-serif" }}
            >
              Works with every major dialect.
            </p>
          </div>

          <div className="relative py-4 md:flex-1 w-full">
            <InfiniteSlider speedOnHover={20} speed={40} gap={64}>
              {SQL_TOOLS.map(({ name, logo }) => (
                <div
                  key={name}
                  className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <img
                    src={logo}
                    alt={`${name} logo`}
                    className="h-6 w-6 object-contain "
                    loading="lazy"
                  />
                  <span
                    className="text-sm font-medium text-muted-foreground whitespace-nowrap"
                    style={{ fontFamily: "'Inter',sans-serif" }}
                  >
                    {name}
                  </span>
                </div>
              ))}
            </InfiniteSlider>

            {/* Edge fades */}
            <div className="absolute inset-y-0 left-0  w-16 bg-gradient-to-r from-background to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none" />
            <ProgressiveBlur
              className="pointer-events-none absolute left-0 top-0 h-full w-16"
              direction="left"
              blurIntensity={1}
            />
            <ProgressiveBlur
              className="pointer-events-none absolute right-0 top-0 h-full w-16"
              direction="right"
              blurIntensity={1}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
