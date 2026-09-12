import { FastifyInstance } from 'fastify';
import { createPaymentHandler, processWebhookHandler } from './payments.controller';
import { authenticate } from '../../middleware/authentication';
import { authorizeRoles } from '../../middleware/authorization';

export async function paymentsRoutes(server: FastifyInstance) {
  // Patient initiates a payment for a consultation
  server.post(
    '/consultations/:id/payments',
    { preHandler: [authenticate, authorizeRoles(['PATIENT'])] },
    createPaymentHandler
  );
}

export async function paymentWebhookRoutes(server: FastifyInstance) {
  // External gateway webhook (Public, verifies own headers)
  server.post('/payments', processWebhookHandler);
}
