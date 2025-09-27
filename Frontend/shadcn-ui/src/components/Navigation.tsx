import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from '@/lib/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadBookDate, loadBookConfirm, loadBookService } from '@/lib/route-imports';
import { buildBookingState } from '@/lib/booking-route';

export default function Navigation() {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const mobileMenuRef = useRef<HTMLDivElement | null>(null);

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            element.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' });
        }
        setIsOpen(false);
    };

    const handleReservation = () => {
        loadBookService();
        loadBookDate();
        loadBookConfirm();
        navigate('/book/service', { state: buildBookingState(location) });
    };

    useEffect(() => {
        if (!isOpen) {
            document.body.style.removeProperty('overflow');
            return;
        }

        document.body.style.setProperty('overflow', 'hidden');

        const menuEl = mobileMenuRef.current;
        const focusableSelectors = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusable = menuEl ? Array.from(menuEl.querySelectorAll<HTMLElement>(focusableSelectors)) : [];

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (first) first.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                return;
            }
            if (event.key === 'Tab' && focusable.length > 0) {
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first?.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.removeProperty('overflow');
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    return (
        <nav className="fixed top-0 w-full bg-black/90 backdrop-blur-sm z-50 border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex-shrink-0">
                        <h1 className="text-2xl font-bold text-white">
                            <span className="text-brand">Deinis</span> Barber Club
                        </h1>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-4">
                            <button
                                onClick={() => scrollToSection('inicio')}
                                className="text-gray-300 hover:text-brand px-3 py-2 text-sm font-medium transition-colors"
                            >
                                Inicio
                            </button>
                            <button
                                onClick={() => scrollToSection('sobre-nosotros')}
                                className="text-gray-300 hover:text-brand px-3 py-2 text-sm font-medium transition-colors"
                            >
                                Sobre Nosotros
                            </button>
                            <button
                                onClick={() => scrollToSection('servicios')}
                                className="text-gray-300 hover:text-brand px-3 py-2 text-sm font-medium transition-colors"
                            >
                                Servicios
                            </button>
                            <button
                                onClick={() => scrollToSection('galeria')}
                                className="text-gray-300 hover:text-brand px-3 py-2 text-sm font-medium transition-colors"
                            >
                                Galería
                            </button>
                            <button
                                onClick={() => scrollToSection('contacto')}
                                className="text-gray-300 hover:text-brand px-3 py-2 text-sm font-medium transition-colors"
                            >
                                Contacto
                            </button>
                            <Button
                                onClick={handleReservation}
                                onMouseEnter={() => {
                                    loadBookService();
                                    loadBookDate();
                                }}
                                onFocus={() => {
                                    loadBookService();
                                    loadBookDate();
                                }}
                                className="bg-brand hover:bg-[#00B894] text-black font-semibold ml-4"
                            >
                                Reserva tu Cita
                            </Button>
                        </div>
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-gray-300 hover:text-white p-2"
                            aria-label="Abrir menú"
                            aria-expanded={isOpen}
                        >
                            {isOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 bg-black/60 md:hidden"
                            aria-hidden="true"
                            onClick={() => setIsOpen(false)}
                        />
                        <div className="md:hidden" ref={mobileMenuRef}>
                            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-black/95 focus:outline-none">
                                <button
                                    onClick={() => scrollToSection('inicio')}
                                    className="text-gray-300 hover:text-brand block px-3 py-2 text-base font-medium w-full text-left transition-colors"
                                >
                                    Inicio
                            </button>
                            <button
                                onClick={() => scrollToSection('sobre-nosotros')}
                                className="text-gray-300 hover:text-brand block px-3 py-2 text-base font-medium w-full text-left transition-colors"
                            >
                                Sobre Nosotros
                            </button>
                            <button
                                onClick={() => scrollToSection('servicios')}
                                className="text-gray-300 hover:text-brand block px-3 py-2 text-base font-medium w-full text-left transition-colors"
                            >
                                Servicios
                            </button>
                            <button
                                onClick={() => scrollToSection('galeria')}
                                className="text-gray-300 hover:text-brand block px-3 py-2 text-base font-medium w-full text-left transition-colors"
                            >
                                Galería
                            </button>
                            <button
                                onClick={() => scrollToSection('contacto')}
                                className="text-gray-300 hover:text-brand block px-3 py-2 text-base font-medium w-full text-left transition-colors"
                            >
                                Contacto
                            </button>
                            <Button
                                onClick={() => { setIsOpen(false); handleReservation(); }}
                                onMouseEnter={() => {
                                    loadBookService();
                                    loadBookDate();
                                }}
                                onFocus={() => {
                                    loadBookService();
                                    loadBookDate();
                                }}
                                className="bg-brand hover:bg-[#00B894] text-black font-semibold w-full mt-4"
                            >
                                Reserva tu Cita
                            </Button>
                        </div>
                    </div>
                    </>
                )}
            </div>
        </nav>
    );
}
