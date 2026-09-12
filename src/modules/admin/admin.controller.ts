import { FastifyRequest, FastifyReply } from 'fastify';
import * as adminService from './admin.service';

export async function getAnalyticsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const analytics = await adminService.getPlatformAnalytics();
    return reply.code(200).send(analytics);
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
}
