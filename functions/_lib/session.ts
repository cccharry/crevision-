/**
 * Cloudflare Pages Functions：会话 Cookie（HMAC-SHA256，仅依赖 Web Crypto）
 */

const COOKIE = 'crevision_sid';
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 天

function enc(): TextEncoder {
  return new TextEncoder();
}

async function importKey(secret: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest('SHA-256', enc().encode(secret));
  return crypto.subtle.importKey('raw', hash, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function b64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

function utf8ToB64url(s: string): string {
  const bytes = enc().encode(s);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlToUtf8(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) bytes[i] = b.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export async function signSession(secret: string, expMs: number): Promise<string> {
  const payload = JSON.stringify({ v: 1, exp: expMs });
  const payloadB64 = utf8ToB64url(payload);
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc().encode(payloadB64));
  return `${payloadB64}.${b64url(sig)}`;
}

export async function verifySession(secret: string, token: string): Promise<boolean> {
  const i = token.lastIndexOf('.');
  if (i <= 0) return false;
  const payloadB64 = token.slice(0, i);
  const sigB64 = token.slice(i + 1);
  try {
    const key = await importKey(secret);
    const expected = await crypto.subtle.sign('HMAC', key, enc().encode(payloadB64));
    const got = b64urlDecode(sigB64);
    const expBuf = new Uint8Array(expected);
    if (got.length !== expBuf.length) return false;
    let ok = 0;
    for (let j = 0; j < got.length; j++) ok |= got[j] ^ expBuf[j];
    if (ok !== 0) return false;
    const json = b64urlToUtf8(payloadB64);
    const o = JSON.parse(json) as { v?: number; exp?: number };
    if (o.v !== 1 || typeof o.exp !== 'number') return false;
    if (Date.now() > o.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function readCookie(request: Request, name: string = COOKIE): string | null {
  const h = request.headers.get('Cookie');
  if (!h) return null;
  const parts = h.split(';').map((s) => s.trim());
  for (const p of parts) {
    if (p.startsWith(`${name}=`)) return decodeURIComponent(p.slice(name.length + 1));
  }
  return null;
}

export function clearSessionCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function buildSetCookie(secret: string, request: Request): Promise<string> {
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  return signSession(secret, exp).then((tok) => {
    const secure = new URL(request.url).protocol === 'https:';
    const parts = [
      `${COOKIE}=${encodeURIComponent(tok)}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${MAX_AGE_SEC}`,
    ];
    if (secure) parts.push('Secure');
    return parts.join('; ');
  });
}

export { COOKIE };
