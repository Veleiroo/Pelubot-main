import { Suspense, lazy, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { loadBookDate, loadBookConfirm } from '@/lib/route-imports';

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
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const w = window as typeof window & {
            requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number;
            cancelIdleCallback?: (id: number) => void;
        };

        const schedulePrefetch = () => {
            loadBookDate();
            loadBookConfirm();
        };

        let idleHandle: number = -1;
        if (w.requestIdleCallback) {
            idleHandle = w.requestIdleCallback(schedulePrefetch, { timeout: 3000 });
        } else {
            idleHandle = window.setTimeout(schedulePrefetch, 1500);
        }

        return () => {
            if (idleHandle === -1) return;
            if (w.cancelIdleCallback) {
                w.cancelIdleCallback(idleHandle);
            } else {
                clearTimeout(idleHandle);
            }
        };
    }, []);

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
