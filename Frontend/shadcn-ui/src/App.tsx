import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation, type Location as RouterLocation } from 'react-router-dom';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import {
    loadBookDate,
    loadBookConfirm,
    loadDebugPage,
    loadBookService,
    loadProsLogin,
    loadProsOverview,
    loadProsShell,
    loadProsAgenda,
    loadProsClients,
    loadProsStats,
    loadProsBackups,
} from '@/lib/route-imports';
const BookDate = lazy(loadBookDate);
const BookConfirm = lazy(loadBookConfirm);
const BookService = lazy(loadBookService);
const ProsLogin = lazy(loadProsLogin);
const ProsOverview = lazy(loadProsOverview);
const ProsShell = lazy(loadProsShell);
const ProsAgenda = lazy(loadProsAgenda);
const ProsClients = lazy(loadProsClients);
const ProsStats = lazy(loadProsStats);
const ProsBackups = lazy(loadProsBackups);
import Loading from '@/components/Loading';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import BookingDialog from '@/components/BookingDialog';
const DEBUG =
  String(import.meta.env.VITE_ENABLE_DEBUG ?? '0') === '1' ||
  String(import.meta.env.VITE_ENABLE_DEBUG ?? '').toLowerCase() === 'true';
const DebugPage = lazy(loadDebugPage);

const queryClient = new QueryClient();

const renderWithSuspense = (Element: React.ComponentType) => (
    <Suspense fallback={<Loading />}>
        <Element />
    </Suspense>
);

const AppRoutes = () => {
    const location = useLocation();
    const state = location.state as { background?: RouterLocation } | undefined;
    const backgroundLocation = state?.background;

    return (
        <>
            <Routes location={backgroundLocation ?? location}>
                <Route path="/" element={<Index />} />
                <Route path="/book/service" element={renderWithSuspense(BookService)} />
                <Route path="/book/date" element={renderWithSuspense(BookDate)} />
                <Route path="/book/confirm" element={renderWithSuspense(BookConfirm)} />
                <Route path="/pros/login" element={renderWithSuspense(ProsLogin)} />
                <Route path="/pros" element={renderWithSuspense(ProsShell)}>
                    <Route index element={renderWithSuspense(ProsOverview)} />
                    <Route path="agenda" element={renderWithSuspense(ProsAgenda)} />
                    <Route path="clientes" element={renderWithSuspense(ProsClients)} />
                    <Route path="estadisticas" element={renderWithSuspense(ProsStats)} />
                    <Route path="backups" element={renderWithSuspense(ProsBackups)} />
                </Route>
                {DEBUG && <Route path="/debug" element={renderWithSuspense(DebugPage)} />}
                <Route path="*" element={<NotFound />} />
            </Routes>

            {backgroundLocation && (
                <Routes>
                    <Route
                        path="/book/service"
                        element={
                            <BookingDialog background={backgroundLocation}>
                                {renderWithSuspense(BookService)}
                            </BookingDialog>
                        }
                    />
                    <Route
                        path="/book/date"
                        element={
                            <BookingDialog background={backgroundLocation}>
                                {renderWithSuspense(BookDate)}
                            </BookingDialog>
                        }
                    />
                    <Route
                        path="/book/confirm"
                        element={
                            <BookingDialog background={backgroundLocation}>
                                {renderWithSuspense(BookConfirm)}
                            </BookingDialog>
                        }
                    />
                </Routes>
            )}
        </>
    );
};

const App = () => (
    <QueryClientProvider client={queryClient}>
        <TooltipProvider>
            <Toaster />
            <BrowserRouter>
                <ErrorBoundary>
                    <AppRoutes />
                </ErrorBoundary>
            </BrowserRouter>
        </TooltipProvider>
    </QueryClientProvider>
);

export default App;
