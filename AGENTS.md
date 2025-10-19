# Repository Guidelines
These notes summarize how to navigate, extend, and release PeluBot.

## Project Structure & Module Organization
- `backend/app` holds the FastAPI application: routers under `api/`, shared services in `services/`, and SQLModel definitions in `models.py`.
- `backend/tests` mirrors the API surface with pytest suites; supporting scripts sit in `backend/scripts`.
- `Frontend/shadcn-ui/src` contains the React + Vite client, organised by feature folders and shared UI primitives under `components`.
- `e2e/tests` provides Playwright journeys that exercise the deployed stack; docs and diagrams live in `docs/`.

## Build, Test, and Development Commands
- `make dev-start` / `make dev-stop` boot or stop the FastAPI server with the correct SQLite path and environment defaults.
- `make front-dev` launches the Vite dev server for the shadcn frontend; use `pnpm dev` inside `Frontend/shadcn-ui` when working locally.
- `make test` executes the backend pytest suite with `PELUBOT_FAKE_GCAL=1`; `make e2e` runs the Playwright headless flows (set `PLAYWRIGHT_MODE=dev` for debugging).
- `make docker-up` and `make docker-dev` combine backend and frontend via Docker Compose when you need a reproducible stack.

## Coding Style & Naming Conventions
- Backend code follows PEP 8 with 4-space indents and descriptive snake_case module/function names; prefer type hints where practical.
- React components live in PascalCase files, hooks in `useFoo.ts`, and shared utilities in `lib/`. Tailwind classes stay inline; repeatable pieces belong in `components/ui`.
- Run `pnpm lint` (ESLint flat config) and keep Tailwind tokens consistent with `tailwind.config.ts`.

## Testing Guidelines
- New backend endpoints require pytest coverage in `backend/tests`, matching filenames with the feature under test (e.g. `test_<area>.py`).
- Frontend behaviour changes should include Playwright specs under `Frontend/shadcn-ui/tests` or colocated hook/unit checks.
- End-to-end scenarios belong in `e2e/tests`; note prerequisites at the top of the spec and gate destructive flows behind env flags.

## Commit & Pull Request Guidelines
- Follow the existing history: short imperative messages (`refactor: reuse shared appointment modal`) or concise English summaries are acceptable; keep scope to a single area.
- Reference tickets in the PR, list manual test steps, and attach UI screenshots when relevant. Flag migrations or scripts that need operator awareness.

## Security & Configuration Tips
- Never commit real `.env`, `oauth_tokens.json`, or SQLite dumps; use `.env.example` or redact values in docs.
- Set `GOOGLE_OAUTH_JSON` locally before running `make sync-*`; coordinate with the team before clearing shared calendars.
