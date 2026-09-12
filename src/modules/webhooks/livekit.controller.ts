import { FastifyRequest, FastifyReply } from 'fastify';
import { WebhookReceiver } from 'livekit-server-sdk';
import { prisma } from '../../infrastructure/database/prisma';

export async function livekitWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const receiver = new WebhookReceiver(
      process.env.LIVEKIT_API_KEY as string,
      process.env.LIVEKIT_API_SECRET as string
    );

    // LiveKit webhooks must be verified using the Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return reply.code(401).send({ error: 'Missing authorization header' });
    }

    // Fastify parses the body as JSON. We can stringify it again for the receiver.
    const bodyString = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
    const event = await receiver.receive(bodyString, authHeader);

    // Event maps to Room events
    if (event.event === 'room_started') {
      const consultationId = event.room?.name;
      if (consultationId) {
        await prisma.consultation.updateMany({
          where: { id: consultationId },
          data: { status: 'IN_PROGRESS' }
        });
      }
    } else if (event.event === 'room_finished') {
      const consultationId = event.room?.name;
      if (consultationId) {
        await prisma.consultation.updateMany({
          where: { id: consultationId },
          data: { status: 'COMPLETED' }
        });
      }
    }

    // Acknowledge receipt
    return reply.code(200).send();
  } catch (error: any) {
    request.log.error(error);
    // If validation fails, return 401
    return reply.code(401).send({ error: 'Invalid webhook signature' });
  }
}
