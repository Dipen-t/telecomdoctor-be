import { FastifyInstance } from 'fastify';
import { createPaymentHandler, processWebhookHandler } from './payments.controller';
import { authenticate } from '../../middleware/authentication';
import { authorizeRoles } from '../../middleware/authorization';

export async function paymentsRoutes(server: FastifyInstance) {
  // Patient initiates a payment for a consultation
  server.post('/consultations/:id/payments', {
    schema: {
      tags: ['Payments'],
      summary: 'Initiate payment for a consultation (Patient)',
      description: 'Creates a PENDING payment record for a consultation. In a production system, this would return a payment gateway redirect URL.',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Consultation UUID' }
        }
      },
      response: {
        201: {
          description: 'Payment initiated',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            consultationId: { type: 'string', format: 'uuid' },
            amount: { type: 'number' },
            currency: { type: 'string', default: 'INR' },
            status: { type: 'string', enum: ['PENDING'] },
            providerReference: { type: 'string', description: 'Mock gateway reference ID' }
          }
        },
        400: { description: 'Validation error', type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } },
        403: { description: 'Forbidden', type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } },
        404: { description: 'Consultation not found', type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } }
      }
    },
    preHandler: [authenticate, authorizeRoles(['PATIENT'])]
  }, createPaymentHandler);
}

export async function paymentWebhookRoutes(server: FastifyInstance) {
  // External gateway webhook (Public, verifies own headers)
  server.post('/payments', {
    schema: {
      tags: ['Webhooks'],
      summary: 'Payment gateway webhook',
      description: 'Receives payment status updates from the payment gateway. In production, this would verify the webhook signature. Updates the payment status from PENDING to SUCCESS or FAILED.',
      body: {
        type: 'object',
        required: ['providerReference', 'status'],
        properties: {
          providerReference: { type: 'string', description: 'The provider reference from the payment initiation' },
          status: { type: 'string', enum: ['SUCCESS', 'FAILED'], description: 'Payment outcome' },
          signature: { type: 'string', description: 'Webhook signature for verification' }
        }
      },
      response: {
        200: { description: 'Webhook processed', type: 'object', properties: { message: { type: 'string' } } },
        400: { description: 'Invalid payload', type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } }
      }
    }
  }, processWebhookHandler);
}
