import { Suspense, lazy } from 'react';
import Navigation from '@/components/Navigation';

const HeroSection = lazy(() => import('@/components/HeroSection'));
const AboutSection = lazy(() => import('@/components/AboutSection'));
const ServicesSection = lazy(() => import('@/components/ServicesSection'));
const GallerySection = lazy(() => import('@/components/GallerySection'));
const ContactSection = lazy(() => import('@/components/ContactSection'));
const Footer = lazy(() => import('@/components/Footer'));

const SectionFallback = ({ label }: { label: string }) => (
    <div className="py-20 text-center text-neutral-500" aria-live="polite">
        Cargando {label}...
    </div>
);

export default function Index() {
    return (
        <div className="min-h-screen bg-black">
            <Navigation />
            <Suspense fallback={<SectionFallback label="inicio" />}>
                <HeroSection />
            </Suspense>
            <Suspense fallback={<SectionFallback label="sobre nosotros" />}>
                <AboutSection />
            </Suspense>
            <Suspense fallback={<SectionFallback label="servicios" />}>
                <ServicesSection />
            </Suspense>
            <Suspense fallback={<SectionFallback label="galería" />}>
                <GallerySection />
            </Suspense>
            <Suspense fallback={<SectionFallback label="contacto" />}>
                <ContactSection />
            </Suspense>
            <Suspense fallback={<SectionFallback label="pie de página" />}>
                <Footer />
            </Suspense>
        </div>
    );
}
