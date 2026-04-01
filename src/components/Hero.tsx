import { HeroSection } from "@/components/HeroSection";
import { LogoStripSection } from "@/components/LogoStripeSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { TracksSection } from "@/components/TracksSection";
import { ShowcaseSection } from "@/components/ShowcaseSection";
import { StatsSection } from "@/components/StatsSection";
import { CTASection, FooterSection } from "@/components/CTASection";

export default function Page() {
  return (
    <>
      <HeroSection />
      <LogoStripSection />
      <FeaturesSection />
      <TracksSection />
      <ShowcaseSection />
      <StatsSection />
      <CTASection />
      <FooterSection />
    </>
  );
}
