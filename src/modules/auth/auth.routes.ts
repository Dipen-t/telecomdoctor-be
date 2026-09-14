import { FastifyInstance } from 'fastify';
import { registerHandler, loginHandler, mfaVerifyHandler } from './auth.controller';

export async function authRoutes(server: FastifyInstance) {
  server.post('/register', {
    schema: {
      tags: ['Authentication'],
      summary: 'Register a new user',
      description: 'Creates a new PATIENT account with a profile. Passwords are hashed using Argon2id.',
      body: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email', description: 'Unique email address' },
          password: { type: 'string', minLength: 8, description: 'Minimum 8 characters' },
          firstName: { type: 'string', minLength: 1 },
          lastName: { type: 'string', minLength: 1 },
          phone: { type: 'string', description: 'Optional phone number' }
        }
      },
      response: {
        201: {
          description: 'User created successfully',
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string' },
                role: { type: 'string', enum: ['PATIENT', 'DOCTOR', 'ADMIN'] }
              }
            },
            tokens: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' }
              }
            }
          }
        },
        400: { description: 'Validation error', type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } },
        409: { description: 'Email already registered', type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } }
      }
    }
  }, registerHandler);

  server.post('/login', {
    schema: {
      tags: ['Authentication'],
      summary: 'Authenticate a user',
      description: 'Validates credentials and returns JWT access + refresh tokens. If MFA is enabled, returns a challenge token instead.',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      },
      response: {
        200: {
          description: 'Login successful — tokens returned',
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string' },
                role: { type: 'string' }
              }
            },
            tokens: {
              type: 'object',
              properties: {
                accessToken: { type: 'string', description: 'Short-lived JWT (15min)' },
                refreshToken: { type: 'string', description: 'Long-lived refresh token (7d)' }
              }
            }
          }
        },
        401: { description: 'Invalid credentials', type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } }
      }
    }
  }, loginHandler);

  server.post('/mfa/verify', {
    schema: {
      tags: ['Authentication'],
      summary: 'Verify MFA challenge',
      description: 'Completes multi-factor authentication by verifying a 6-digit TOTP code against a challenge token stored in Redis.',
      body: {
        type: 'object',
        required: ['mfaToken', 'challengeToken'],
        properties: {
          mfaToken: { type: 'string', minLength: 6, maxLength: 6, description: '6-digit TOTP code' },
          challengeToken: { type: 'string', description: 'Challenge token from login response' }
        }
      },
      response: {
        200: {
          description: 'MFA verified — tokens returned',
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' }
              }
            },
            tokens: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' }
              }
            }
          }
        },
        401: { description: 'Invalid or expired MFA code', type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } }
      }
    }
  }, mfaVerifyHandler);
}
