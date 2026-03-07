import * as Sentry from "@sentry/nextjs";

function parseBooleanEnv(value: string | undefined): boolean {
  if (!value) return false;

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

const replayOptIn = parseBooleanEnv(process.env.NEXT_PUBLIC_SENTRY_REPLAY_OPT_IN);

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tunnel: "/monitoring",
  debug: process.env.NODE_ENV !== "production",
  sendDefaultPii: false,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  replaysSessionSampleRate: replayOptIn ? 0.1 : 0,
  replaysOnErrorSampleRate: replayOptIn ? 1.0 : 0,
  integrations: replayOptIn
    ? [
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ]
    : [],
  beforeSend(event) {
    if (event.user) {
      event.user = {
        ...event.user,
        email: undefined,
        ip_address: undefined,
        username: undefined,
      };
    }

    if (event.request?.headers) {
      const { authorization, cookie, ...safeHeaders } = event.request.headers;
      void authorization;
      void cookie;
      event.request.headers = safeHeaders;
    }

    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
