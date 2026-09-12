import { FastifyInstance } from 'fastify';
import { livekitWebhookHandler } from './livekit.controller';

export async function webhooksRoutes(server: FastifyInstance) {
  // LiveKit fires POST requests to notify us of room events
  server.post('/livekit', livekitWebhookHandler);
}
