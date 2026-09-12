import { prisma } from '../../infrastructure/database/prisma';
import { redis } from '../../infrastructure/redis/redis';
import { hashPassword, verifyPassword } from '../../security/password';
import { generateAccessToken, generateRefreshToken } from '../../security/tokens';
import { verifyMfaToken } from '../../security/mfa';
import { z } from 'zod';
import { registerSchema } from './auth.schema';
import crypto from 'crypto';

type RegisterInput = z.infer<typeof registerSchema>;

export async function register(input: RegisterInput) {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) {
    throw new Error('User already exists');
  }

  const hashedPassword = await hashPassword(input.password);

  // Use a transaction to ensure User and Profile are created together
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        role: 'PATIENT',
      }
    });

    await tx.profile.create({
      data: {
        userId: newUser.id,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone
      }
    });

    return newUser;
  });

  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user.id, role: user.role });

  return {
    user: { id: user.id, email: user.email, role: user.role },
    tokens: { accessToken, refreshToken }
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const valid = await verifyPassword(user.password, password);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  // If MFA is enabled, issue a challenge instead of tokens
  if (user.mfaEnabled) {
    const challengeToken = crypto.randomBytes(32).toString('hex');
    // Store challenge in redis for 5 minutes
    await redis.set(`mfa_challenge:${challengeToken}`, user.id, 'EX', 300);
    
    return {
      mfaRequired: true,
      challengeToken
    };
  }

  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user.id, role: user.role });

  return {
    user: { id: user.id, email: user.email, role: user.role },
    tokens: { accessToken, refreshToken }
  };
}

export async function verifyMfaLogin(challengeToken: string, mfaToken: string) {
  const userId = await redis.get(`mfa_challenge:${challengeToken}`);
  if (!userId) {
    throw new Error('Invalid or expired challenge token');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.mfaSecret) {
    throw new Error('Invalid or expired challenge token');
  }

  const valid = verifyMfaToken(mfaToken, user.mfaSecret);
  if (!valid) {
    throw new Error('Invalid MFA code');
  }

  // Burn the challenge token
  await redis.del(`mfa_challenge:${challengeToken}`);

  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user.id, role: user.role });

  return {
    user: { id: user.id, email: user.email, role: user.role },
    tokens: { accessToken, refreshToken }
  };
}
