import * as _SentryImport from "@sentry/react";

// @sentry/react v10 re-exports captureException etc. from @sentry/browser v10,
// but a stale top-level @sentry/browser v5 package confuses TS type resolution.
// Cast to any here; the runtime calls are correct.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Sentry = _SentryImport as any;

// Initialize Sentry only in production
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE || "development";

  // A valid Sentry DSN is exactly https://<publicKey>@<host>/<projectId>.
  // Guard against a malformed value (e.g. the project URL accidentally
  // concatenated with the DSN) so Sentry doesn't spam the console with CORS
  // and 404 envelope errors against a broken endpoint.
  const isValidDsn = typeof dsn === "string" && /^https:\/\/[^@/]+@[^/]+\/\d+$/.test(dsn.trim());

  // Only initialize with a well-formed DSN outside development.
  if (isValidDsn && environment !== "development") {
    Sentry.init({
      dsn,
      environment,
      integrations: [
        // Commented out until Sentry version is updated
        // Sentry.browserTracingIntegration(),
        // Sentry.replayIntegration({
        //   maskAllText: true,
        //   blockAllMedia: true,
        // }),
        // Sentry.reactRouterV7BrowserTracingIntegration({
        //   useEffect,
        //   useLocation,
        //   useNavigationType,
        //   createRoutesFromChildren,
        //   matchRoutes,
        // }),
      ],

      // Performance Monitoring
      tracesSampleRate: environment === "production" ? 0.1 : 1.0, // 10% in prod, 100% in staging

      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of all sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

      // Customize error filtering
      beforeSend(event: any, hint: any) {
        // Filter out certain errors
        const error = hint.originalException;

        // Ignore network errors in development
        if (
          error &&
          typeof error === "object" &&
          "message" in error &&
          typeof error.message === "string"
        ) {
          // Ignore AbortController errors (user-initiated)
          if (error.message.includes("AbortError")) {
            return null;
          }

          // Ignore wallet connection errors (user-initiated)
          if (
            error.message.includes("User rejected") ||
            error.message.includes("User denied")
          ) {
            return null;
          }
        }

        return event;
      },

      // Set user context (will be set after authentication)
      beforeBreadcrumb(breadcrumb: any) {
        // Filter sensitive data from breadcrumbs
        if (breadcrumb.category === "console") {
          return breadcrumb;
        }
        return breadcrumb;
      },
    });

    console.log(
      `[Sentry] Initialized in ${environment} mode with trace sample rate: ${
        environment === "production" ? "10%" : "100%"
      }`
    );
  } else {
    console.log("[Sentry] Skipped initialization (development mode or no DSN)");
  }
};

// Helper to set user context after login
export const setSentryUser = (user: {
  id: string;
  email?: string;
  name?: string;
}) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
};

// Helper to clear user context on logout
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

// Helper to capture custom errors
export const captureError = (
  error: unknown,
  context?: Record<string, any>
) => {
  if (context) {
    Sentry.setContext("additional", context);
  }
  Sentry.captureException(error);
};

// Helper to capture custom messages
export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = "info") => {
  Sentry.captureMessage(message, level);
};

// Helper to add breadcrumb
export const addBreadcrumb = (
  message: string,
  category: string,
  level: 'info' | 'warning' | 'error' = "info"
) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    timestamp: Date.now() / 1000,
  });
};

export default Sentry;
