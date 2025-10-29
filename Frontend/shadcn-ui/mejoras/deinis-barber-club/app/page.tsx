import { Navbar } from "@/components/barber/navbar"
import { HeroSection } from "@/components/barber/hero-section"
import { ServicesSection } from "@/components/barber/services-section"
import { AboutSection } from "@/components/barber/about-section"
import { GallerySection } from "@/components/barber/gallery-section"
import { ContactSection } from "@/components/barber/contact-section"
import { Footer } from "@/components/barber/footer"
import { WhatsAppButton } from "@/components/barber/whatsapp-button"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <ServicesSection />
      <AboutSection />
      <GallerySection />
      <ContactSection />
      <Footer />
      <WhatsAppButton />
    </main>
  )
}
