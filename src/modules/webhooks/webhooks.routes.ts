import { FastifyInstance } from 'fastify';
import { livekitWebhookHandler } from './livekit.controller';

export async function webhooksRoutes(server: FastifyInstance) {
  // LiveKit fires POST requests to notify us of room events
  server.post('/livekit', {
    schema: {
      tags: ['Webhooks'],
      summary: 'LiveKit video room webhook',
      description: 'Receives room lifecycle events from LiveKit (e.g. participant_joined, room_finished). Verifies the webhook signature using LIVEKIT_API_KEY and LIVEKIT_API_SECRET before processing.',
      body: {
        type: 'object',
        description: 'Raw LiveKit webhook payload (signature verified via Authorization header)'
      },
      response: {
        200: { description: 'Webhook processed', type: 'object', properties: { message: { type: 'string' } } },
        401: { description: 'Invalid webhook signature', type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } }
      }
    }
  }, livekitWebhookHandler);
}
