/**
 * Lokarta: Come Into The Light - Application Entry Point
 * Re-exports app subsystems and bootstraps LokartaApp on DOM ready.
 */

import { LokartaApp } from './app/index.js';

export * from './app/index.js';

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.lokarta = new LokartaApp();
  });
}
