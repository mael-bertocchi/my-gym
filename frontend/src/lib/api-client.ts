import type { ApiError, Maybe } from '@/shared/models';

/**
 * @interface ApiClientConfig
 * @description Injected collaborators for the api-client (keeps it pure-testable, no globals).
 */
export interface ApiClientConfig {
    baseUrl: string; /*!< Backend base URL without the /v1 prefix */
    fetchImpl: typeof fetch; /*!< Fetch implementation (real fetch in app, stub in tests) */
    getAccessToken: () => Promise<Maybe<string>>; /*!< Reads the current access token */
    onRefresh: () => Promise<string>; /*!< Rotates BOTH tokens, persists them, returns the new access token */
    onAuthLost: () => Promise<void>; /*!< Clears the session and routes to sign-in */
}

/**
 * @interface ApiClient
 * @description The Bearer-injecting JSON client over the {data}/{message} envelope.
 */
export interface ApiClient {
    get: <T>(path: string) => Promise<T>; /*!< GET unwrapping {data} */
    post: <T>(path: string, body?: unknown) => Promise<T>; /*!< POST unwrapping {data} */
    patch: <T>(path: string, body?: unknown) => Promise<T>; /*!< PATCH unwrapping {data} */
    del: <T>(path: string) => Promise<T>; /*!< DELETE unwrapping {data} */
    list: <T>(path: string) => Promise<T>; /*!< GET returning the FULL list body {data,pagination} unchanged (no {data} unwrap) */
}

/**
 * @function castEnvelopeData
 * @description Last-resort unchecked widening of the envelope's `data` to the caller's generic T. This is the SINGLE sanctioned escape in the codebase: the backend envelope is dynamically typed and T is the call-site contract. Isolated here so no `as` appears anywhere else; eslint-disabled on this one line only.
 *
 * @param {unknown} data The raw envelope data.
 * @returns {T} The data narrowed to the caller's expected type.
 */
function castEnvelopeData<T>(data: unknown): T {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return data as T;
}

/**
 * @function toApiError
 * @description Builds an ApiError from a non-2xx Response, reading status from the response and message from the envelope body.
 *
 * @param {Response} response The failed response.
 * @returns {Promise<ApiError>} The normalized error.
 */
async function toApiError(response: Response): Promise<ApiError> {
    let message: string = response.statusText;
    let data: unknown = null;
    try {
        const body: Record<string, unknown> = { ...(await response.json()) };
        if (typeof body.message === 'string') {
            message = body.message;
        }
        data = body.data;
    } catch {
        /* non-JSON error body: keep status text */
    }
    return { status: response.status, message, data };
}

/**
 * @function createApiClient
 * @description Creates an ApiClient with single-flight 401→refresh→retry-once and envelope unwrapping.
 *
 * @param {ApiClientConfig} config The injected collaborators.
 * @returns {ApiClient} The configured client.
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
    let inFlightRefresh: Maybe<Promise<string>> = null;

    /**
     * @function refreshOnce
     * @description Shares a single refresh across concurrent 401s; clears the session on failure.
     *
     * @returns {Promise<string>} The new access token.
     */
    async function refreshOnce(): Promise<string> {
        if (inFlightRefresh !== null) {
            return inFlightRefresh;
        }
        const pending: Promise<string> = config.onRefresh().catch(async (error: unknown) => {
            await config.onAuthLost();
            throw error;
        }).finally(() => { inFlightRefresh = null; });
        inFlightRefresh = pending;
        return pending;
    }

    /**
     * @function callRaw
     * @description Performs one request with refresh-retry and returns the PARSED body unchanged (no envelope unwrap).
     *
     * @param {string} method The HTTP method.
     * @param {string} path The path under /v1.
     * @param {unknown} body Optional JSON body.
     * @returns {Promise<T>} The parsed response body.
     */
    async function callRaw<T>(method: string, path: string, body?: unknown): Promise<T> {
        /**
         * @function send
         * @description Issues the fetch with a given bearer token.
         *
         * @param {Maybe<string>} token The access token to send.
         * @returns {Promise<Response>} The raw response.
         */
        async function send(token: Maybe<string>): Promise<Response> {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token !== null) {
                headers.Authorization = `Bearer ${token}`;
            }
            const init: RequestInit = { method, headers };
            if (body !== undefined) {
                init.body = JSON.stringify(body);
            }
            return config.fetchImpl(`${config.baseUrl}/v1${path}`, init);
        }

        const token: Maybe<string> = await config.getAccessToken();
        let response: Response = await send(token);

        if (response.status === 401) {
            const fresh: string = await refreshOnce();
            response = await send(fresh);
        }
        if (!response.ok) {
            throw await toApiError(response);
        }

        const parsed: unknown = await response.json();
        return castEnvelopeData<T>(parsed);
    }

    /**
     * @function call
     * @description Performs one request and returns the unwrapped envelope `data` (single-item contract).
     *
     * @param {string} method The HTTP method.
     * @param {string} path The path under /v1.
     * @param {unknown} body Optional JSON body.
     * @returns {Promise<T>} The unwrapped data.
     */
    async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
        const envelope: { data?: unknown } = { ...(await callRaw<{ data?: unknown }>(method, path, body)) };
        return castEnvelopeData<T>(envelope.data);
    }

    return {
        get: <T>(path: string) => call<T>('GET', path),
        post: <T>(path: string, b?: unknown) => call<T>('POST', path, b),
        patch: <T>(path: string, b?: unknown) => call<T>('PATCH', path, b),
        del: <T>(path: string) => call<T>('DELETE', path),
        list: <T>(path: string) => callRaw<T>('GET', path)
    };
}
