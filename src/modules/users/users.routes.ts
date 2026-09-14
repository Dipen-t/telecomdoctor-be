import { FastifyInstance } from 'fastify';
import { getMeHandler, updateMeHandler } from './users.controller';
import { authenticate } from '../../middleware/authentication';

export async function usersRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authenticate);
  
  server.get('/me', {
    schema: {
      tags: ['Users'],
      summary: 'Get current user profile',
      description: 'Returns the authenticated user\'s profile including personal details. Requires a valid JWT.',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'User profile',
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string' },
                role: { type: 'string', enum: ['PATIENT', 'DOCTOR', 'ADMIN'] },
                profile: {
                  type: 'object',
                  properties: {
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    phone: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        401: { description: 'Unauthorized', type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, getMeHandler);

  server.patch('/me', {
    schema: {
      tags: ['Users'],
      summary: 'Update current user profile',
      description: 'Allows the authenticated user to update their profile fields.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phone: { type: 'string' }
        }
      },
      response: {
        200: { 
          description: 'Profile updated', 
          type: 'object', 
          properties: { 
            profile: { type: 'object' } 
          } 
        },
        401: { description: 'Unauthorized', type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, updateMeHandler);
}
