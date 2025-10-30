FROM mcr.microsoft.com/playwright:v1.55.0-jammy

WORKDIR /e2e

RUN corepack enable && corepack prepare pnpm@8.10.0 --activate

# Cache deps
COPY e2e/package.json e2e/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy tests and config
COPY e2e/playwright.config.js ./playwright.config.js
COPY e2e/tests ./tests

# Playwright browsers are preinstalados en esta imagen base

CMD ["pnpm", "test"]
