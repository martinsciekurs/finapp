// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

function parseBooleanEnv(value: string | undefined): boolean {
  if (!value) return false;

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

function parseSampleRate(
  value: string | undefined,
  fallback: number
): number {
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return fallback;
  return parsed;
}

const isDevelopment = process.env.NODE_ENV === "development";
const sendDefaultPii = parseBooleanEnv(process.env.SENTRY_SEND_DEFAULT_PII);
const tracesSampleRate = parseSampleRate(
  process.env.SENTRY_TRACES_SAMPLE_RATE,
  isDevelopment ? 1.0 : 0.2
);
const enableLogs =
  isDevelopment || parseBooleanEnv(process.env.SENTRY_ENABLE_LOGS);

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate,

  // Enable logs to be sent to Sentry
  enableLogs,

  integrations: [Sentry.vercelAIIntegration()],

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii,
});
