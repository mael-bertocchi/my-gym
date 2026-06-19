import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { generateAdvice, loadAdviceContext } from 'src/modules/assistant/assistant-advice';
import type { AdviceParamsRequest } from 'src/modules/assistant/assistant-models';
import { RequestError } from 'src/shared/models';

/**
 * @function getVariantAdvice
 * @description Returns progressive-overload advice for one of the user's exercise variants, generated from its recent history.
 *
 * @returns {Promise<void>} Resolves when the advice is sent.
 */
async function getVariantAdvice(request: FastifyRequest<AdviceParamsRequest>, reply: FastifyReply): Promise<void> {
    const context = await loadAdviceContext(request.server.prisma, request.user.id, request.params.id);

    if (context === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise variant not found');
    }

    const advice = await generateAdvice(request.server.ai, context);

    reply.status(StatusCodes.OK).send({ data: { advice } });
}

export default {
    getVariantAdvice
};
