import { createHash, timingSafeEqual } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { HttpError } from './http';

const ISSUER = 'valex-api';
const AUDIENCE = 'valex-admin';
const TOKEN_TTL_SECONDS = 8 * 60 * 60;

export interface Session {
  token: string;
  expiresAt: string;
  username: string;
}

function secret(): Uint8Array {
  const value = process.env.JWT_SECRET ?? '';
  if (value.length < 32) throw new Error('JWT_SECRET must be set to at least 32 characters.');
  return new TextEncoder().encode(value);
}

/** Constant-time comparison (hashing first makes both sides the same length). */
function safeEqual(a: string, b: string): boolean {
  const digest = (s: string) => createHash('sha256').update(s, 'utf8').digest();
  return timingSafeEqual(digest(a), digest(b));
}

/** Checks the credentials against ADMIN_USERNAME / ADMIN_PASSWORD and issues a signed JWT. */
export async function login(username: string, password: string): Promise<Session | null> {
  const expectedUser = process.env.ADMIN_USERNAME ?? '';
  const expectedPassword = process.env.ADMIN_PASSWORD ?? '';
  if (!expectedUser || !expectedPassword) throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD must be set.');

  // Evaluate both so the response time doesn't reveal which one was wrong.
  const userOk = safeEqual(username, expectedUser);
  const passwordOk = safeEqual(password, expectedPassword);
  if (!userOk || !passwordOk) return null;

  const expires = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(expectedUser)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expires.getTime() / 1000))
    .sign(secret());

  return { token, expiresAt: expires.toISOString(), username: expectedUser };
}

export async function isAdmin(req: Request): Promise<boolean> {
  const header = req.headers.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return false;
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, audience: AUDIENCE, algorithms: ['HS256'] });
    return payload['role'] === 'admin';
  } catch {
    return false;
  }
}

/** Throws 401 unless the request carries a valid admin token. */
export async function requireAdmin(req: Request): Promise<void> {
  if (!(await isAdmin(req))) throw new HttpError(401, 'Necesitas iniciar sesión como administrador.');
}

// Best-effort brute-force protection. Memory is per serverless instance, so on Vercel this only
// slows attackers down; a shared store (e.g. Upstash) would be needed for a strict global limit.
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

export function checkLoginRate(req: Request): void {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count++;
  if (entry.count > MAX_ATTEMPTS) throw new HttpError(429, 'Demasiados intentos. Espera un minuto.');
}
