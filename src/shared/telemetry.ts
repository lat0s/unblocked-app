// Cookieless analytics and error reports. Both are off unless the build sets the env vars (dev, previews, forks stay silent).
const UMAMI_ID = import.meta.env.VITE_UMAMI_ID as string | undefined;
const UMAMI_SRC = import.meta.env.VITE_UMAMI_SRC as string | undefined;
const DSN = import.meta.env.VITE_GLITCHTIP_DSN as string | undefined;

type Umami = { track: (event: string, data?: Record<string, string | number>) => void };

export function track(event: string, data?: Record<string, string | number>) {
  try {
    (window as unknown as { umami?: Umami }).umami?.track(event, data);
  } catch {
    /* blocked or not loaded */
  }
}

let started = false;

export function initTelemetry() {
  if (typeof window === "undefined" || started) return;
  started = true;
  const start = () => {
    if (UMAMI_ID && UMAMI_SRC) {
      const s = document.createElement("script");
      s.defer = true;
      s.src = UMAMI_SRC;
      s.dataset.websiteId = UMAMI_ID;
      s.dataset.doNotTrack = "true";
      s.dataset.domains = location.hostname;
      document.head.appendChild(s);
    }
    if (DSN) {
      // Errors only: no replay, tracing, breadcrumbs or personal data
      import("@sentry/browser")
        .then((S) =>
          S.init({
            dsn: DSN,
            defaultIntegrations: false,
            tracesSampleRate: 0,
            integrations: [S.globalHandlersIntegration(), S.linkedErrorsIntegration(), S.dedupeIntegration()],
          }),
        )
        .catch(() => {});
    }
  };
  // After first paint, when the browser is idle
  const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  const later = () => (idle ? idle(start) : setTimeout(start, 1500));
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later, { once: true });
}
