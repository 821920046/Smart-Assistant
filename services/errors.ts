/**
 * Custom error classes for better error handling and categorization
 */

export type SyncErrorCode = 'AUTH' | 'NETWORK' | 'CONFLICT' | 'ENCRYPTION' | 'CONFIG' | 'UNKNOWN';
export type StorageErrorCode = 'INIT' | 'READ' | 'WRITE' | 'QUOTA' | 'UNKNOWN';

/**
 * Sync-related errors with retry capability indicator
 */
export class SyncError extends Error {
    readonly code: SyncErrorCode;
    readonly retryable: boolean;
    readonly statusCode?: number;

    constructor(
        message: string,
        code: SyncErrorCode,
        options?: { retryable?: boolean; statusCode?: number }
    ) {
        super(message);
        this.name = 'SyncError';
        this.code = code;
        this.retryable = options?.retryable ?? false;
        this.statusCode = options?.statusCode;
    }

    static fromHttpStatus(status: number, message?: string): SyncError {
        if (status === 401) {
            return new SyncError(
                message || 'Authentication failed. Please check your credentials.',
                'AUTH',
                { retryable: false, statusCode: status }
            );
        }
        if (status === 409) {
            return new SyncError(
                message || 'Sync conflict detected.',
                'CONFLICT',
                { retryable: false, statusCode: status }
            );
        }
        if (status >= 500) {
            return new SyncError(
                message || 'Server error. Please try again later.',
                'NETWORK',
                { retryable: true, statusCode: status }
            );
        }
        return new SyncError(
            message || `Request failed with status ${status}`,
            'UNKNOWN',
            { retryable: false, statusCode: status }
        );
    }
}

/**
 * Storage-related errors
 */
export class StorageError extends Error {
    readonly code: StorageErrorCode;

    constructor(message: string, code: StorageErrorCode) {
        super(message);
        this.name = 'StorageError';
        this.code = code;
    }
}

/**
 * Error utilities
 */
export function isSyncError(error: unknown): error is SyncError {
    return error instanceof SyncError;
}

export function isStorageError(error: unknown): error is StorageError {
    return error instanceof StorageError;
}

export function isRetryableError(error: unknown): boolean {
    if (isSyncError(error)) {
        return error.retryable;
    }
    // Network errors are generally retryable
    if (error instanceof Error) {
        return error.message.includes('network') ||
            error.message.includes('timeout') ||
            error.message.includes('fetch');
    }
    return false;
}
