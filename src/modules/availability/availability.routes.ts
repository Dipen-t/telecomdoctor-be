import { FastifyInstance } from 'fastify';
import { createSlotHandler, getSlotsHandler, deleteSlotHandler } from './availability.controller';
import { authenticate } from '../../middleware/authentication';
import { authorizeRoles } from '../../middleware/authorization';

export async function availabilityRoutes(server: FastifyInstance) {
  server.get('/doctors/:doctorId/availability', {
    schema: {
      tags: ['Availability'],
      summary: 'Get doctor availability slots',
      description: 'Public endpoint. Returns all available time slots for a specific doctor.',
      params: {
        type: 'object',
        required: ['doctorId'],
        properties: {
          doctorId: { type: 'string', format: 'uuid', description: 'Doctor UUID' }
        }
      },
        200: {
          description: 'List of availability slots',
          type: 'object',
          properties: {
            slots: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  doctorId: { type: 'string', format: 'uuid' },
                  startTime: { type: 'string', format: 'date-time' },
                  endTime: { type: 'string', format: 'date-time' },
                  status: { type: 'string', enum: ['AVAILABLE', 'BOOKED', 'BLOCKED', 'CANCELLED'] }
                }
              }
            }
          }
        }
      }
    }
  }, getSlotsHandler);

  server.post('/doctors/:doctorId/availability', {
    schema: {
      tags: ['Availability'],
      summary: 'Create an availability slot (Doctor/Admin)',
      description: 'Creates a new time slot for the doctor. Validates that endTime > startTime and checks for overlapping slots.',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['doctorId'],
        properties: {
          doctorId: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        required: ['startTime', 'endTime'],
        properties: {
          startTime: { type: 'string', format: 'date-time', description: 'ISO 8601 start time' },
          endTime: { type: 'string', format: 'date-time', description: 'ISO 8601 end time (must be after startTime)' }
        }
      },
      response: {
        201: { 
          description: 'Slot created', 
          type: 'object',
          properties: {
            slot: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                doctorId: { type: 'string', format: 'uuid' },
                startTime: { type: 'string', format: 'date-time' },
                endTime: { type: 'string', format: 'date-time' },
                status: { type: 'string' }
              }
            }
          }
        },
        400: { description: 'Validation error (e.g. endTime before startTime)', type: 'object', properties: { error: { type: 'string' } } },
        403: { description: 'Forbidden', type: 'object', properties: { error: { type: 'string' } } }
      }
    },
    preHandler: [authenticate, authorizeRoles(['DOCTOR', 'ADMIN'])]
  }, createSlotHandler);

  server.delete('/availability/:slotId', {
    schema: {
      tags: ['Availability'],
      summary: 'Delete an availability slot (Doctor/Admin)',
      description: 'Removes an availability slot. Only the owning doctor or an admin can delete.',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['slotId'],
        properties: {
          slotId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        204: { description: 'Slot deleted', type: 'null' },
        403: { description: 'Forbidden', type: 'object', properties: { error: { type: 'string' } } },
        404: { description: 'Slot not found', type: 'object', properties: { error: { type: 'string' } } }
      }
    },
    preHandler: [authenticate, authorizeRoles(['DOCTOR', 'ADMIN'])]
  }, deleteSlotHandler);
}
