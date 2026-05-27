import LandingFooter from '../components/landing/LandingFooter'
import LandingNavbar from '../components/landing/LandingNavbar'
import HeroSection from '../components/landing/HeroSection'
import WorkflowSection from '../components/landing/WorkflowSection'
import FeatureEcosystem from '../components/landing/FeatureEcosystem'
import SocialProofSection from '../components/landing/SocialProofSection'
import PricingSection from '../components/landing/PricingSection'

export default function Landing() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#F7FAF5] text-neutral-950 transition-colors dark:bg-[#020617] dark:text-white">
      <LandingNavbar />
      <HeroSection />
      <WorkflowSection />
      <FeatureEcosystem />
      <SocialProofSection />
      <PricingSection />
      <LandingFooter />
    </main>
  )
}
