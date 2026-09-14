import { FastifyInstance } from 'fastify';
import { createBookingHandler, getMyBookingsHandler, getVideoToken } from './bookings.controller';
import { authenticate } from '../../middleware/authentication';
import { authorizeRoles } from '../../middleware/authorization';
import { rateLimiter } from '../../middleware/rate-limit';
import { idempotencyInterceptor } from '../../middleware/idempotency';

export async function bookingsRoutes(server: FastifyInstance) {
  // Get Patient's bookings
  server.get('/', {
    schema: {
      tags: ['Bookings'],
      summary: 'Get my bookings',
      description: 'Returns all consultations/bookings for the authenticated patient. Supports filtering by status and pagination.',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'], description: 'Filter by consultation status' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
          offset: { type: 'integer', minimum: 0, default: 0 }
        }
      },
      response: {
        200: {
          description: 'List of bookings with consultation details',
          type: 'object',
          properties: {
            consultations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  status: { type: 'string' },
                  meetingRoomId: { type: 'string' },
                  slot: {
                    type: 'object',
                    properties: {
                      startTime: { type: 'string', format: 'date-time' },
                      endTime: { type: 'string', format: 'date-time' },
                      doctor: { type: 'object' }
                    }
                  }
                }
              }
            }
          }
        },
        401: { description: 'Unauthorized', type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } }
      }
    },
    preHandler: [authenticate, authorizeRoles(['PATIENT'])]
  }, getMyBookingsHandler);

  // Book a slot (Critical Route)
  server.post('/', {
    schema: {
      tags: ['Bookings'],
      summary: 'Book a consultation slot',
      description: 'Books an available slot for the authenticated patient. This is the most critical write operation in the system.\n\n' +
        '**Concurrency:** Uses PostgreSQL `SELECT ... FOR UPDATE` row-level locking to prevent double-booking.\n\n' +
        '**Idempotency:** Requires an `Idempotency-Key` header. Replaying the same key returns the cached response. ' +
        'Sending a different body with the same key returns `400 IDEMPOTENCY_MISMATCH`.\n\n' +
        '**Rate Limited:** 10 requests per minute per user.\n\n' +
        '**Transactional Outbox:** A notification event is written inside the same database transaction for reliable async delivery.',
      security: [{ bearerAuth: [] }],
      headers: {
        type: 'object',
        required: ['idempotency-key'],
        properties: {
          'idempotency-key': { type: 'string', format: 'uuid', description: 'Unique client-generated key for idempotent booking' }
        }
      },
      body: {
        type: 'object',
        required: ['slotId'],
        properties: {
          slotId: { type: 'string', format: 'uuid', description: 'The availability slot UUID to book' }
        }
      },
      response: {
        201: {
          description: 'Booking created successfully',
          type: 'object',
          properties: {
            message: { type: 'string' },
            consultationId: { type: 'string', format: 'uuid' }
          }
        },
        400: { description: 'Validation error or idempotency mismatch', type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } },
        409: { description: 'Slot already booked (concurrency conflict)', type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } },
        429: { description: 'Rate limit exceeded', type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } }
      }
    },
    preHandler: [
      authenticate,
      authorizeRoles(['PATIENT']),
      rateLimiter(10, 60),
      idempotencyInterceptor
    ]
  }, createBookingHandler);

  // Generate LiveKit Video Token
  server.post('/:id/video/token', {
    schema: {
      tags: ['Bookings'],
      summary: 'Generate video consultation token',
      description: 'Generates a LiveKit video token for the consultation. Only the patient or doctor assigned to the consultation can generate a token. Validates resource ownership.',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Consultation UUID' }
        }
      },
      response: {
        200: {
          description: 'Video token generated',
          type: 'object',
          properties: {
            token: { type: 'string', description: 'LiveKit JWT token for video room' },
            roomName: { type: 'string' }
          }
        },
        403: { description: 'Not authorized for this consultation', type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } },
        404: { description: 'Consultation not found', type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } }
      }
    },
    preHandler: [authenticate, authorizeRoles(['PATIENT', 'DOCTOR'])]
  }, getVideoToken);
}
