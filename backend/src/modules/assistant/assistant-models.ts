import type { RequestGenericInterface } from 'fastify';

/**
 * @interface AdviceParamsRequest
 * @description Fastify request generic for requesting advice on a single exercise variant.
 *
 * @extends RequestGenericInterface
 */
export interface AdviceParamsRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Exercise variant identifier */
    };
}
