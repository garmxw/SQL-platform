"use client";

// HeroSection  ·  Vorn landing page

import React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useScroll, motion, useMotionValueEvent } from "motion/react";
import { Button } from "@/components/ui/button";
import FaultyTerminal from "./FaultyTerminal";
import { cn } from "@/lib/utils";
import { Menu, X, ChevronRight, Moon, Sun, Code2 } from "lucide-react";
import Image from "next/image";
//logo
import VornLight from "../../public/vorn_dark.svg";
import VornDark from "../../public/vorn_light.svg";

// ── Font note:
// Add to your layout.tsx or _document.tsx:
//   import { Inter } from "next/font/google"
//   const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
// Then className={`${inter.variable}`} on <html>

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Tracks", href: "#tracks" },
  { label: "Community", href: "#community" },
  { label: "Docs", href: "/docs" },
];

// Navbar
function HeroHeader() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const { scrollYProgress } = useScroll();

  useMotionValueEvent(scrollYProgress, "change", (v) => setScrolled(v > 0.02));

  return (
    <header>
      <nav
        data-state={menuOpen ? "active" : undefined}
        className="group fixed z-50 w-full pt-2"
      >
        <div
          className={cn(
            "mx-auto max-w-7xl rounded-3xl px-5 transition-all duration-300 lg:px-10",
            scrolled &&
              "bg-background/70 backdrop-blur-xl border border-border/50 shadow-sm",
          )}
        >
          <motion.div
            className={cn(
              "relative flex flex-wrap items-center justify-between gap-4 py-3 duration-200 lg:gap-0 lg:py-5",
              scrolled && "lg:py-3",
            )}
          >
            {/* Left: logo */}
            <div className="flex w-full items-center justify-between lg:w-auto">
              <Link
                href="/"
                className="flex items-center gap-2.5"
                aria-label="Vorn home"
              >
                <Image
                  src={VornDark}
                  alt="Vorn logo"
                  width={30}
                  height={30}
                  className="w-10 h-auto dark:hidden"
                />
                <Image
                  src={VornLight}
                  alt="Vorn logo"
                  width={30}
                  height={30}
                  className="w-10 h-auto hidden dark:block"
                />
                <span className="text-lg font-extrabold inline-block transform scale-x-140 origin-left">
                  Vorn
                </span>
              </Link>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                className="relative z-20 -m-2 p-2 lg:hidden"
              >
                <Menu
                  className={cn(
                    "w-5 h-5 transition-all duration-200",
                    menuOpen && "opacity-0 scale-0 rotate-180",
                  )}
                />
                <X
                  className={cn(
                    "w-5 h-5 absolute inset-0 m-auto transition-all duration-200 opacity-0 scale-0 -rotate-180",
                    menuOpen && "opacity-100 scale-100 rotate-0",
                  )}
                />
              </button>

              {/* Desktop nav links */}
              <ul className="hidden lg:flex items-center gap-8 ml-10 text-sm">
                {NAV_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground transition-colors duration-150"
                      style={{ fontFamily: "'Inter',sans-serif" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: theme toggle + CTA */}
            <div
              className={cn(
                "bg-background group-data-[state=active]:flex hidden w-full flex-col space-y-4 rounded-2xl border border-border p-5 shadow-lg mb-4",
                "lg:mb-0 lg:flex lg:w-auto lg:flex-row lg:items-center lg:space-y-0 lg:gap-3 lg:rounded-none lg:border-none lg:bg-transparent lg:p-0 lg:shadow-none",
              )}
            >
              {/* Mobile nav links */}
              <ul className="flex flex-col gap-4 lg:hidden text-base">
                {NAV_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      style={{ fontFamily: "'Inter',sans-serif" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-sm rounded-full px-4"
                >
                  <Link href="/login">Log in</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="text-sm rounded-full px-5 gap-1"
                >
                  <Link href="/signup">
                    Get Started
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </nav>
    </header>
  );
}

// Hero
export function HeroSection() {
  return (
    <>
      <HeroHeader />

      <main className="relative overflow-x-hidden">
        <section className="relative min-h-screen flex flex-col">
          {/* Floating text content - now centered */}
          <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-12 pt-40 pb-24 lg:pt-52 lg:pb-36 flex-1 flex items-center justify-center">
            <div className="max-w-2xl mx-auto text-center">
              {/* Eyebrow */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted/50 text-xs text-muted-foreground mb-6"
                style={{ fontFamily: "'Inter',sans-serif" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Now in public beta · Free to start
              </motion.div>

              {/* Headline - centered, blue removed, now uses Inter font */}
              <motion.h1
                initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  duration: 0.7,
                  delay: 0.2,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
                className="text-5xl md:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.08] text-balance"
                style={{ fontFamily: "'Sora','Syne',sans-serif" }}
              >
                Master Sql
                <br />
                query by query
              </motion.h1>

              {/* Sub */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
                style={{ fontFamily: "'Inter',sans-serif" }}
              >
                Vorn is a structured SQL learning platform with real-time
                feedback, adaptive tracks from foundations to advanced window
                functions, and an in-browser editor that feels like a real
                database workspace.
              </motion.p>

              {/* CTAs - now centered */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.55 }}
                className="mt-10 flex flex-col sm:flex-row gap-3 justify-center"
              >
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-full pl-6 pr-4 text-base gap-2"
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
                  className="h-12 rounded-full px-6 text-base"
                >
                  <Link href="#demo">See it in action</Link>
                </Button>
              </motion.div>

              {/* Social proof */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.75 }}
                className="mt-6 text-sm text-muted-foreground"
                style={{ fontFamily: "'Inter',sans-serif" }}
              >
                Trusted by{" "}
                <span className="text-foreground font-medium">2,400+</span>{" "}
                students and developers worldwide.
              </motion.p>
            </div>
          </div>

          {/* FaultyTerminal — full hero section background */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.3 }}
            className="absolute inset-0 z-0 overflow-hidden"
          >
            {/* Gradient mask blending into background on the left (keeps text readable) */}
            <div className="absolute inset-0 z-10 bg-gradient-to-r from-background via-background/60 to-transparent lg:via-background/20 pointer-events-none" />
            {/* Bottom fade */}
            <div className="absolute bottom-0 inset-x-0 z-10 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />

            <div
              style={{ width: "100%", height: "100%", position: "relative" }}
            >
              <FaultyTerminal
                scale={1.5}
                gridMul={[2, 1]}
                digitSize={1.2}
                timeScale={0.5}
                pause={false}
                scanlineIntensity={0.5}
                glitchAmount={1}
                flickerAmount={1}
                noiseAmp={1}
                chromaticAberration={0}
                dither={0}
                curvature={0.1}
                tint="#22a1ff"
                mouseReact
                mouseStrength={0.5}
                pageLoadAnimation
                brightness={0.6}
              />
            </div>
          </motion.div>

          {/* Decorative bottom border */}
          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </section>
      </main>
    </>
  );
}
