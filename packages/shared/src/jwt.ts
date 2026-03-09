import { jwtVerify } from 'jose';
import type { JWTPayload } from './types';

export async function verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
