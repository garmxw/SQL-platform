"use client";
// ─────────────────────────────────────────────────────────────────────────────
// CTASection + FooterSection  ·  Vorn landing page
// Separable: import { CTASection } from "@/components/sections/cta-section"
//            import { FooterSection } from "@/components/sections/cta-section"
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { GradualBlur } from "@/components/GradualBlur";
import { Badge } from "@/components/ui/badge";
import { Code2, ChevronRight, Github, Twitter } from "lucide-react";

export function CTASection() {
  return (
    <section className="relative py-32 lg:py-48 overflow-hidden bg-background">
      {/* Subtle radial background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="w-[600px] h-[600px] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 lg:px-12 text-center">
        <GradualBlur className="space-y-8">
          <Badge variant="outline" className="text-xs">
            Free · No credit card
          </Badge>

          <h2
            className="text-5xl md:text-6xl xl:text-7xl font-bold tracking-tight text-balance leading-[1.06]"
            style={{ fontFamily: "'Sora','Syne',sans-serif" }}
          >
            Ready to actually
            <br />
            <span className="text-blue-500">master SQL?</span>
          </h2>

          <p
            className="text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed"
            style={{ fontFamily: "'Inter',sans-serif" }}
          >
            Start with the foundations track today. No setup, no configuration —
            just open the editor and write your first query.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              asChild
              size="lg"
              className="h-13 rounded-full px-8 text-base gap-2"
            >
              <Link href="/signup">
                Start Learning Free
                <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-13 rounded-full px-8 text-base"
            >
              <Link href="/tracks">Browse Tracks</Link>
            </Button>
          </div>
        </GradualBlur>
      </div>
    </section>
  );
}

const FOOTER_LINKS = {
  Platform: [
    { label: "Problems", href: "/problems" },
    { label: "Tracks", href: "/tracks" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Editor", href: "/editor" },
  ],
  Learn: [
    { label: "SQL Basics", href: "/tracks/foundations" },
    { label: "Joins", href: "/tracks/joins" },
    { label: "Window Functions", href: "/tracks/window-functions" },
    { label: "Optimization", href: "/tracks/optimization" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};

export function FooterSection() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 pb-0">
        {/* Top row - Brand + Links */}
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 mb-12">
          {/* Brand column - now includes copyright directly below GitHub/Twitter icons */}
          <div className="lg:w-56 shrink-0">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Code2 className="w-5 h-5" />
              <span
                className="text-lg font-bold tracking-tight"
                style={{ fontFamily: "'Sora','Syne',sans-serif" }}
              >
                Vorn
              </span>
            </Link>
            <p
              className="text-sm text-muted-foreground leading-relaxed"
              style={{ fontFamily: "'Inter',sans-serif" }}
            >
              A structured SQL learning platform with real feedback, adaptive
              tracks, and a real editor.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                asChild
              >
                <Link href="https://github.com" aria-label="GitHub">
                  <Github className="w-4 h-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                asChild
              >
                <Link href="https://twitter.com" aria-label="Twitter">
                  <Twitter className="w-4 h-4" />
                </Link>
              </Button>
            </div>

            {/* Copyright now placed directly below the GitHub & Twitter icons */}
            <p
              className="mt-6 text-xs text-muted-foreground"
              style={{ fontFamily: "'Inter',sans-serif" }}
            >
              © {new Date().getFullYear()} Vorn. Built for SQL master.
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 flex-1">
            {Object.entries(FOOTER_LINKS).map(([group, links]) => (
              <div key={group}>
                <p
                  className="text-sm font-semibold mb-4"
                  style={{ fontFamily: "'Inter',sans-serif" }}
                >
                  {group}
                </p>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        style={{ fontFamily: "'Inter',sans-serif" }}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Massive Vorn wordmark — made much bigger + pushed extremely close to the bottom edge */}
        <div className="flex justify-center select-none -mb-2">
          <span
            className="pointer-events-none text-[clamp(9rem,29vw,19rem)] font-bold leading-none tracking-[-0.02em] text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(to bottom, black 0%, rgba(150,150,150,0.5) 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
            }}
          >
            Vorn
          </span>
        </div>
      </div>
    </footer>
  );
}
