import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Loading from '@/components/Loading';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const ProsLogin = lazy(() => import('@/pages/pro/Login'));
const ProsShell = lazy(() => import('@/pages/pro/Shell'));
const ProsOverview = lazy(() => import('@/pages/pro/Overview'));
const ProsAgenda = lazy(() => import('@/pages/pro/Agenda'));
const ProsClients = lazy(() => import('@/pages/pro/Clients'));
const ProsStats = lazy(() => import('@/pages/pro/Stats'));

const queryClient = new QueryClient();

const renderWithSuspense = (Element: React.ComponentType) => (
    <Suspense fallback={<Loading />}>
        <Element />
    </Suspense>
);

const AppRoutes = () => (
    <Routes>
        <Route path="/pros/login" element={renderWithSuspense(ProsLogin)} />
        <Route path="/pros" element={renderWithSuspense(ProsShell)}>
            <Route index element={renderWithSuspense(ProsOverview)} />
            <Route path="agenda" element={renderWithSuspense(ProsAgenda)} />
            <Route path="clientes" element={renderWithSuspense(ProsClients)} />
            <Route path="estadisticas" element={renderWithSuspense(ProsStats)} />
        </Route>
        <Route path="*" element={<Navigate to="/pros" replace />} />
    </Routes>
);

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
