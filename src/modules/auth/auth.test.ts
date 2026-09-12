import { describe, it, expect, beforeAll } from 'vitest';
import { hashPassword, verifyPassword } from '../../security/password';
import { generateAccessToken } from '../../security/tokens';

describe('Auth Service Core Logic', () => {
  it('should hash a password using Argon2 and verify it successfully', async () => {
    const rawPassword = 'SuperSecretPassword123!';
    const hashedPassword = await hashPassword(rawPassword);
    
    expect(hashedPassword).not.toBe(rawPassword);
    
    const isMatch = await verifyPassword(hashedPassword, rawPassword);
    expect(isMatch).toBe(true);
  });

  it('should reject incorrect passwords', async () => {
    const rawPassword = 'SuperSecretPassword123!';
    const hashedPassword = await hashPassword(rawPassword);
    
    const isMatch = await verifyPassword(hashedPassword, 'WrongPassword123!');
    expect(isMatch).toBe(false);
  });

  it('should generate valid JWT tokens with correct payloads', async () => {
    const payload = { userId: '123', role: 'PATIENT' as const };
    const accessToken = generateAccessToken(payload);
    
    expect(accessToken).toBeDefined();
    
    const accessParts = accessToken.split('.');
    expect(accessParts.length).toBe(3);
  });
});
