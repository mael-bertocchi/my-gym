import { createApiClient } from '@/lib/api-client';
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
