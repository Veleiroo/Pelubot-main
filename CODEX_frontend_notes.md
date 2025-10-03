# Frontend Quick Notes (Codex)

## Stack & Entrypoints
- React 19 + Vite + TypeScript + Tailwind + shadcn/ui; router handled in `src/App.tsx`.
- `QueryClientProvider` wraps app; `React Router` uses background route state to reopen booking flow as modal over landing (`BookingDialog`).
- Suspense + lazy imports via `src/lib/route-imports.ts`; landing prefetches booking routes on idle.

## Routing
- `/` renders landing sections (Navigation + Hero + About + Services + Gallery + Contact + Footer).
- `/book/service`, `/book/date`, `/book/confirm` lazily loaded; optional modal overlay if navigated from landing (stored `background` in location state via `buildBookingState`).
- Optional `/debug` route under `VITE_ENABLE_DEBUG`; `NotFound` fallback rehydrates debug lazily if user hits `/debug` without route but path matches.

## State Management (Zustand `useBooking`)
- State fields: `serviceId`, `serviceName`, `professionalId/Name`, `date`, `slotStart`, `customerName/Phone/Email`, `notes`.
- Actions reset downstream selections when upstream changes (service → reset pro/date/slot; professional change clears slot etc.).
- `reset()` clears booking to defaults after successful confirm or when user goes home.

## API Layer (`src/lib/api.ts`)
- `BASE` computed from `VITE_API_BASE_URL` (preferred) or origin + optional `VITE_API_BASE_PATH`.
- `http` wrapper adds JSON headers, optional API key, 12s timeout, debug logging when `VITE_ENABLE_DEBUG` truthy.
- Endpoints: `getServices`, `getProfessionals`, `getSlots`, `createReservation`, `getDaysAvailability`.
- Custom `ApiError` surfaces `status`, `detail`, `requestId` for user-friendly messages.

## Booking Flow Pages
- **Service** (`pages/book/Service.tsx`)
  - React Query fetches services (`queryKey: ['services']`); skeleton UI while loading.
  - Prefetches professionals + month availability when service hovered/focused (deduped by `prefetched` Set) to smooth Date step.
  - On selection: updates store, pushes `/book/date?service=<id>` with location state produced via `buildBookingState`.
- **Date** (`pages/book/Date.tsx`)
  - URL sync: reads `service`, `service_name`, optional `pro`/`pro_name`; rehydrates store if direct deep link.
  - Loads services to backfill missing labels; auto-selects only professional if list length = 1; warns if none available.
  - Calendar logic using `date-fns`: restricts to 6 months window, caches availability by month, accessible keyboard navigation.
  - `useQuery` for `days-availability` + `slots`, toggles between morning/afternoon ranges; uses `use_gcal` flag derived from env.
  - Continue CTA builds query params for Confirm + passes background state (snapshot of selections).
- **Confirm** (`pages/book/Confirm.tsx`)
  - Lazy fetch services/pros on mount to enrich summary; rehydrates store from URL/state if direct entry.
  - Validates contact fields; auto attempts fallback when no professional pre-selected by iterating candidates.
  - Maps `ApiError` messages/status to localized user feedback; updates toast notifications.
  - Post-success: show success panel, allow booking another or go home (reset state).
  - Handles missing prerequisites by prompting navigation back to Service.

## Shared Booking Components
- `BookingLayout`: shared wrapper with step indicator + summary slot + consistent container.
- `BookingSteps`: visual progress `ol`, indicates current/past steps.
- `BookingDialog`: Radix dialog used to render flow as modal; closing returns to background location.
- `BookingSection`/`ServiceCard`: marketing style cards reused on Service page.

## Landing Components Summary
- `Navigation`: sticky top nav with mobile trap; CTA preloads booking routes + navigates with background state.
- `HeroSection`, `AboutSection`, `ServicesSection`, `GallerySection`, `ContactSection`, `Footer`: static marketing content; Services & Contact include booking CTA hooking into router state; Gallery has lightbox state.
- Footer includes floating WhatsApp CTA.

## Utilities & Hooks
- `lib/booking-route.ts`: helpers to preserve background location, used by navigation and Confirm back actions.
- `lib/format.ts`: euro/date/time formatting for confirm summary.
- `hooks/use-mobile.tsx`: matchMedia-based mobile detection (unused currently).
- Shadcn `components/ui/*`: standard wrappers (buttons, inputs, select, toasts, etc.); custom `CalendarNav` for month header.

## Styling & Config
- Tailwind config extends color tokens (`--brand` emerald), custom shadows/animations.
- `index.css` defines CSS variables and DayPicker overrides; `styles/calendar.css` adds fade animation.
- Build config via `vite.config.ts` alias `@` → `src`.

## Testing
- `tests/e2e/booking.spec.ts` Playwright suite covering full booking flow (mocks API endpoints) + dialog dismissal.
- Scripts: `pnpm run test:e2e:preview` builds + runs tests against `vite preview`.

## Environment Flags
- `VITE_API_BASE_URL` / `VITE_API_BASE_PATH` for backend endpoint.
- `VITE_ENABLE_DEBUG` toggles `/debug` route & console logs.
- `VITE_USE_GCAL` forwards `use_gcal` to availability endpoints.
- Optional `VITE_API_KEY` appended to headers.

## Observations / Follow-ups
- `components/ui/sonner.tsx` references `next-themes`; ensure provider present or adjust theme handling if issues.
- Checkout phone/email validation (basic) in Confirm; consider more robust formatting later.
- Many content strings hardcoded in Spanish; check for future localization requirements.
- Landing CTA phone/WhatsApp numbers placeholders; align with real contact info before prod.

