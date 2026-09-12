import { authenticator } from 'otplib';

/**
 * Generates a new TOTP secret for a user.
 */
export function generateMfaSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generates a standard Key URI for QR code generation.
 */
export function generateMfaUri(email: string, secret: string): string {
  return authenticator.keyuri(email, 'Amrutam Telemedicine', secret);
}

/**
 * Verifies a 6-digit TOTP token against the user's secret.
 */
export function verifyMfaToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (err) {
    return false;
  }
}
