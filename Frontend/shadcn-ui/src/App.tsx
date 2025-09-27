import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation, type Location as RouterLocation } from 'react-router-dom';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import { loadBookDate, loadBookConfirm, loadDebugPage, loadBookService } from '@/lib/route-imports';
const BookDate = lazy(loadBookDate);
const BookConfirm = lazy(loadBookConfirm);
const BookService = lazy(loadBookService);
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
