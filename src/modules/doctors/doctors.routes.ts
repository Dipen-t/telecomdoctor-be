import { FastifyInstance } from 'fastify';
import { createDoctorHandler, searchDoctorsHandler, getDoctorByIdHandler } from './doctors.controller';
import { authenticate } from '../../middleware/authentication';
import { authorizeRoles } from '../../middleware/authorization';

export async function doctorsRoutes(server: FastifyInstance) {
  server.get('/', {
    schema: {
      tags: ['Doctors'],
      summary: 'Search and list doctors',
      description: 'Public endpoint. Returns a paginated list of doctors, optionally filtered by specialty.',
      querystring: {
        type: 'object',
        properties: {
          specialty: { type: 'string', description: 'Filter by medical specialty (e.g. cardiology)' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
          offset: { type: 'integer', minimum: 0, default: 0 }
        }
      },
      response: {
        200: {
          description: 'Paginated list of doctors',
          properties: {
            doctors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  specialty: { type: 'string' },
                  qualification: { type: 'string' },
                  experience: { type: 'integer' },
                  consultationFee: { type: 'number' },
                  status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, searchDoctorsHandler);

  server.get('/:id', {
    schema: {
      tags: ['Doctors'],
      summary: 'Get doctor by ID',
      description: 'Public endpoint. Returns a single doctor\'s full profile.',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Doctor UUID' }
        }
      },
      response: {
        200: { 
          description: 'Doctor profile', 
          type: 'object',
          properties: {
            doctor: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                specialty: { type: 'string' },
                qualification: { type: 'string' },
                experience: { type: 'integer' },
                consultationFee: { type: 'number' },
                firstName: { type: 'string' },
                lastName: { type: 'string' }
              }
            }
          }
        },
        404: { description: 'Doctor not found', type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, getDoctorByIdHandler);

  server.post('/', {
    schema: {
      tags: ['Doctors'],
      summary: 'Create a new doctor (Admin only)',
      description: 'Creates a new doctor account with associated user and profile. Requires ADMIN role.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName', 'specialty', 'qualification', 'experience', 'consultationFee'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phone: { type: 'string' },
          specialty: { type: 'string', description: 'e.g. cardiology, dermatology' },
          qualification: { type: 'string', description: 'e.g. MBBS, MD' },
          experience: { type: 'integer', minimum: 0, description: 'Years of experience' },
          consultationFee: { type: 'number', minimum: 0, description: 'Fee in INR' }
        }
      },
      response: {
        201: { 
          description: 'Doctor created', 
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            userId: { type: 'string', format: 'uuid' }
          }
        },
        400: { description: 'Validation error', type: 'object', properties: { error: { type: 'string' } } },
        403: { description: 'Forbidden — requires ADMIN role', type: 'object', properties: { error: { type: 'string' } } }
      }
    },
    preHandler: [authenticate, authorizeRoles(['ADMIN'])]
  }, createDoctorHandler);
}
