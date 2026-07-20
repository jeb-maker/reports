/**
 * Page / browser / viewport / timing context.
 */
export function collectContext() {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const win = typeof window !== 'undefined' ? window : {};
  const doc = typeof document !== 'undefined' ? document : {};

  let timing = null;
  try {
    const entries = performance.getEntriesByType?.('navigation');
    const navEntry = entries?.[0];
    if (navEntry) {
      timing = {
        type: navEntry.type,
        domContentLoadedMs: Math.round(navEntry.domContentLoadedEventEnd),
        loadEventMs: Math.round(navEntry.loadEventEnd),
        durationMs: Math.round(navEntry.duration),
      };
    } else if (performance.timing) {
      const t = performance.timing;
      timing = {
        domContentLoadedMs: t.domContentLoadedEventEnd - t.navigationStart,
        loadEventMs: t.loadEventEnd - t.navigationStart,
      };
    }
  } catch {
    timing = null;
  }

  const mq = win.matchMedia?.('(prefers-color-scheme: dark)');

  return {
    page: {
      url: win.location?.href,
      referrer: doc.referrer || '',
      title: doc.title || '',
      lang: doc.documentElement?.lang || nav.language,
    },
    browser: {
      userAgent: nav.userAgent,
      platform: nav.platform,
      language: nav.language,
      languages: nav.languages ? [...nav.languages] : undefined,
      cookieEnabled: nav.cookieEnabled,
      online: nav.onLine,
    },
    viewport: {
      innerWidth: win.innerWidth,
      innerHeight: win.innerHeight,
      devicePixelRatio: win.devicePixelRatio,
      orientation: win.screen?.orientation?.type,
      colorScheme: mq?.matches ? 'dark' : 'light',
    },
    timing,
  };
}
