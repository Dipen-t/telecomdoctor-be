import { FastifyRequest, FastifyReply } from 'fastify';

export function authorizeRoles(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
  };
}
