// Shared Playwright resolution for standalone verification scripts.
import { createRequire } from 'node:module'
export const { chromium } = createRequire(import.meta.url)(process.env.POMOGIT_PLAYWRIGHT_MODULE || 'playwright')
