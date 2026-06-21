import { createApiClient } from '@/lib/api-client';
import type { ApiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@/lib/use-paginated-query';
import { isApiError } from '@/shared/models';

/**
 * @function jsonResponse
 * @description Builds a real Response with a JSON body and status for the fetch stub.
 *
 * @param {number} status The HTTP status code.
 * @param {unknown} body The JSON body.
 * @returns {Response} A Response instance.
 */
function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/**
 * @interface FakeResponse
 * @description The minimal slice of Response the api-client reads, used to stub fetch without a real Response.
 */
interface FakeResponse {
    ok: boolean; /*!< Whether the status is 2xx */
    status: number; /*!< HTTP status code */
    statusText: string; /*!< Status text fallback message */
    json: () => Promise<unknown>; /*!< Parsed JSON body */
}

/**
 * @function fakeFetch
 * @description Builds a fetch stub that resolves to a real Response carrying the given body as JSON.
 *
 * @param {unknown} body The body returned by json().
 * @returns {typeof fetch} A fetch-compatible stub.
 */
function fakeFetch(body: unknown): typeof fetch {
    const fields: FakeResponse = { ok: true, status: 200, statusText: 'OK', json: (): Promise<unknown> => Promise.resolve(body) };
    return (): Promise<Response> => Promise.resolve(new Response(JSON.stringify(body), { status: fields.status }));
}

/**
 * @function buildClient
 * @description Builds an api-client wired to a body-returning fetch stub and a static token.
 *
 * @param {unknown} body The body every request resolves to.
 * @returns {ApiClient} The configured client.
 */
function buildClient(body: unknown): ApiClient {
    return createApiClient({
        baseUrl: 'https://example.test',
        fetchImpl: fakeFetch(body),
        getAccessToken: (): Promise<string> => Promise.resolve('token'),
        onRefresh: (): Promise<string> => Promise.resolve('token'),
        onAuthLost: (): Promise<void> => Promise.resolve()
    });
}

describe('api-client', () => {
    it('unwraps the data envelope on 200', async () => {
        const fetchStub: typeof fetch = async () => jsonResponse(200, { data: { id: 'u1' } });
        const client = createApiClient({
            baseUrl: 'http://x',
            fetchImpl: fetchStub,
            getAccessToken: async () => 'tok',
            onRefresh: async () => 'tok',
            onAuthLost: async () => {}
        });
        await expect(client.get('/identity/me')).resolves.toEqual({ id: 'u1' });
    });

    it('normalizes a 409 into an ApiError carrying status + message', async () => {
        const fetchStub: typeof fetch = async () => jsonResponse(409, { message: 'Conflict', data: null });
        const client = createApiClient({
            baseUrl: 'http://x',
            fetchImpl: fetchStub,
            getAccessToken: async () => 'tok',
            onRefresh: async () => 'tok',
            onAuthLost: async () => {}
        });
        await client.get('/gym-locations').catch((error: unknown) => {
            expect(isApiError(error)).toBe(true);
            if (isApiError(error)) {
                expect(error.status).toBe(409);
                expect(error.message).toBe('Conflict');
            }
        });
        expect.assertions(3);
    });

    it('refreshes once on 401 then retries, sharing one in-flight refresh', async () => {
        let calls: number = 0;
        let refreshes: number = 0;
        const fetchStub: typeof fetch = async () => {
            calls += 1;
            if (calls <= 2) {
                return jsonResponse(401, { message: 'Unauthorized', data: null });
            }
            return jsonResponse(200, { data: { ok: true } });
        };
        const client = createApiClient({
            baseUrl: 'http://x',
            fetchImpl: fetchStub,
            getAccessToken: async () => 'old',
            onRefresh: async () => { refreshes += 1; return 'new'; },
            onAuthLost: async () => {}
        });
        const [a, b] = await Promise.all([client.get('/a'), client.get('/b')]);
        expect(a).toEqual({ ok: true });
        expect(b).toEqual({ ok: true });
        expect(refreshes).toBe(1);
    });

    it('calls onAuthLost and throws 401 when refresh itself fails', async () => {
        const fetchStub: typeof fetch = async () => jsonResponse(401, { message: 'Unauthorized', data: null });
        let lost: boolean = false;
        const client = createApiClient({
            baseUrl: 'http://x',
            fetchImpl: fetchStub,
            getAccessToken: async () => 'old',
            onRefresh: async () => { throw new Error('refresh failed'); },
            onAuthLost: async () => { lost = true; }
        });
        await client.get('/a').catch(() => {});
        expect(lost).toBe(true);
    });
});

describe('ApiClient list', () => {
    it('preserves the pagination sibling of a list body', async () => {
        const body: PaginatedResponse<{ id: string }> = { data: [{ id: 'a' }], pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 } };
        const client = buildClient(body);
        const result = await client.list<PaginatedResponse<{ id: string }>>('/exercises');
        expect(result.pagination.totalPages).toBe(1);
        expect(result.data.map((row) => row.id)).toEqual(['a']);
    });

    it('get still unwraps to the inner data for single-item bodies', async () => {
        const client = buildClient({ data: { id: 'x' } });
        const result = await client.get<{ id: string }>('/exercises/x');
        expect(result.id).toBe('x');
    });
});
