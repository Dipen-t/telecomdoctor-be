import { FastifyInstance } from 'fastify';
import { createPrescriptionHandler, getPrescriptionHandler } from './prescriptions.controller';
import { authenticate } from '../../middleware/authentication';
import { authorizeRoles } from '../../middleware/authorization';

export async function prescriptionsRoutes(server: FastifyInstance) {
  // Create a prescription (Doctors only)
  server.post('/:id/prescriptions', {
    schema: {
      tags: ['Prescriptions'],
      summary: 'Create a prescription (Doctor only)',
      description: 'Creates a prescription for a completed consultation. Only the doctor assigned to the consultation can create it. Validates resource ownership in business logic.',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Consultation UUID' }
        }
      },
      body: {
        type: 'object',
        required: ['items'],
        properties: {
          notes: { type: 'string', description: 'General prescription notes' },
          items: {
            type: 'array',
            minItems: 1,
            description: 'At least one prescription item is required',
            items: {
              type: 'object',
              required: ['medicine', 'dosage', 'frequency', 'duration'],
              properties: {
                medicine: { type: 'string', description: 'Medicine name (e.g. Amoxicillin)' },
                dosage: { type: 'string', description: 'Dosage (e.g. 500mg)' },
                frequency: { type: 'string', description: 'Frequency (e.g. 1-0-1)' },
                duration: { type: 'string', description: 'Duration (e.g. 5 days)' },
                instructions: { type: 'string', description: 'Optional special instructions' }
              }
            }
          }
        }
      },
      response: {
        201: { 
          description: 'Prescription created', 
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            consultationId: { type: 'string', format: 'uuid' },
            doctorId: { type: 'string', format: 'uuid' },
            notes: { type: 'string' }
          }
        },
        400: { description: 'Validation error', type: 'object', properties: { error: { type: 'string' } } },
        403: { description: 'Doctor does not own this consultation', type: 'object', properties: { error: { type: 'string' } } },
        404: { description: 'Consultation not found', type: 'object', properties: { error: { type: 'string' } } }
      }
    },
    preHandler: [authenticate, authorizeRoles(['DOCTOR'])]
  }, createPrescriptionHandler);

  // Get a prescription (Doctor or Patient)
  server.get('/:id/prescriptions', {
    schema: {
      tags: ['Prescriptions'],
      summary: 'Get prescription for a consultation',
      description: 'Returns the prescription and its items for a consultation. Only the assigned doctor or the patient can view it.',
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
          description: 'Prescription with items',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            consultationId: { type: 'string', format: 'uuid' },
            notes: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  medicine: { type: 'string' },
                  dosage: { type: 'string' },
                  frequency: { type: 'string' },
                  duration: { type: 'string' },
                  instructions: { type: 'string' }
                }
              }
            }
          }
        },
        403: { description: 'Not authorized', type: 'object', properties: { error: { type: 'string' } } },
        404: { description: 'Not found', type: 'object', properties: { error: { type: 'string' } } }
      }
    },
    preHandler: [authenticate, authorizeRoles(['DOCTOR', 'PATIENT'])]
  }, getPrescriptionHandler);
}
