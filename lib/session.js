import { createHash, randomBytes, webcrypto } from 'node:crypto';

const SESSION_COOKIE = 'fb_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not configured.');
  return createHash('sha256').update(secret).digest();
}

function toBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function fromBase64Url(value) {
  return Buffer.from(value, 'base64url');
}

export async function encryptSession(session) {
  const iv = randomBytes(12);
  const key = await webcrypto.subtle.importKey(
    'raw',
    getKey(),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const plaintext = new TextEncoder().encode(JSON.stringify(session));
  const ciphertext = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );

  return `${toBase64Url(iv)}.${toBase64Url(ciphertext)}`;
}

export async function decryptSession(value) {
  if (!value) return null;

  try {
    const [ivPart, ciphertextPart] = value.split('.');
    if (!ivPart || !ciphertextPart) return null;

    const key = await webcrypto.subtle.importKey(
      'raw',
      getKey(),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    const plaintext = await webcrypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64Url(ivPart) },
      key,
      fromBase64Url(ciphertextPart)
    );

    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    return null;
  }
}

export function setSessionCookie(response, value) {
  response.cookies.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/'
  });
}

export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  });
}

export { SESSION_COOKIE };
