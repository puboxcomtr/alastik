
import { unstable_rethrow } from 'next/navigation';

export class ApiUnavailableError extends Error {
    constructor(what: string, detail: string) {
        super(`[${what}] API kullanılamıyor: ${detail}`);
        this.name = 'ApiUnavailableError';
    }
}

export const PAGE_FETCH_TIMEOUT = 20000;

export function throwIfUnavailable(res: Response, what: string): void {
    if (res.status >= 500 || res.status === 429) {
        throw new ApiUnavailableError(what, `HTTP ${res.status}`);
    }
}

export function rethrowUnavailable(error: unknown, what: string): never {
    unstable_rethrow(error);
    if (error instanceof ApiUnavailableError) throw error;
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    throw new ApiUnavailableError(what, detail);
}
