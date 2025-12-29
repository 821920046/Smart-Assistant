/**
 * Application constants - centralized configuration values
 */

// Storage & Data Retention
export const RETENTION_PERIOD_DAYS = 2;
export const RETENTION_PERIOD_MS = RETENTION_PERIOD_DAYS * 24 * 60 * 60 * 1000;

// Sync Intervals
export const SYNC_INTERVAL_IDLE_MS = 15 * 60 * 1000;    // 15 minutes when idle
export const SYNC_INTERVAL_ACTIVE_MS = 5 * 60 * 1000;   // 5 minutes when active
export const SYNC_DEBOUNCE_MS = 30 * 1000;              // 30 seconds after changes

// Retry Configuration
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 1000;

// IndexedDB
export const DB_NAME = 'MemoAI_DB';
export const DB_VERSION = 4;

// UI
export const TOAST_DURATION_MS = 3000;
export const ANIMATION_DURATION_MS = 300;

// API Rate Limits
export const GITHUB_API_RATE_LIMIT_BUFFER = 100; // requests to reserve
