/**
 * Lokarta: Come Into The Light - Application Entry Point
 * Re-exports app subsystems, boots the studio splash, and constructs LokartaApp.
 */

import { LokartaApp } from './app/index.js';
import { showSplash } from './app/splash-screen.js';

export * from './app/index.js';

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const prefersReduced = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

    const splashPromise = showSplash(document.getElementById('splash-overlay'), { reduceMotion: prefersReduced });

    const app = new LokartaApp();
    // The splash runs concurrently with worker + IndexedDB warm-up so it adds
    // zero perceived load time; init() awaits it before showing the title.
    app.splashPromise = splashPromise;
    window.lokarta = app;
  });
}
