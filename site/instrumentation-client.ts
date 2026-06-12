import posthog from 'posthog-js'

// The token lives in .env.local (not committed) and is inlined at build time
// by the static export. A deploy without it should ship a quiet no-analytics
// site, not a console error on every page view.
const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN

if (token) {
  posthog.init(token, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: '2026-01-30',
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
  })
} else if (process.env.NODE_ENV === 'production') {
  console.warn('PostHog disabled: NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN was not set at build time.')
}
