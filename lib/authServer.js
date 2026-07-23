import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

export const SESSION_COOKIE = 'premix_session';
const SESSION_MAX_AGE = 60 * 60 * 10; // 10 horas

/* Cliente com a service_role key — NUNCA importar em arquivos client. */
export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Variáveis do Supabase não configuradas.');
  return createClient(
    url,
    key,
    { auth: { persistSession: false } }
  );
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

export async function comparePassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%';
  let pw = '';
  for (let i = 0; i < 14; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

function sessionSecret() {
  const value = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error('SESSION_SECRET ou SUPABASE_SERVICE_ROLE_KEY não configurada.');
  return value;
}

function encode(value) {
  return Buffer.from(value).toString('base64url');
}

function decode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signature(payload) {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

export function createSessionToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = encode(JSON.stringify({
    sub: user.id,
    iat: now,
    exp: now + SESSION_MAX_AGE,
    nonce: randomBytes(8).toString('hex'),
  }));
  return `${payload}.${signature(payload)}`;
}

export function readSessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = signature(payload);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const data = JSON.parse(decode(payload));
    if (!data.sub || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export function attachSessionCookie(response, user) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: createSessionToken(user),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

export function clearSessionCookie(response) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

/**
 * Valida a sessão assinada e consulta o usuário ativo no banco.
 * roles: lista opcional de perfis autorizados.
 */
export async function verifySession(req, roles = null) {
  const raw = req?.cookies?.get?.(SESSION_COOKIE)?.value;
  const session = readSessionToken(raw);
  if (!session) return null;

  const supa = getServiceClient();
  const { data, error } = await supa
    .from('usuarios_painel')
    .select('id, nome, email, cargo, telefone, role, ativo, primeiro_login, created_at')
    .eq('id', session.sub)
    .eq('ativo', true)
    .single();

  if (error || !data) return null;
  if (roles && !roles.includes(data.role)) return null;
  return data;
}

/* Compatibilidade temporária para código antigo. Novas rotas devem usar verifySession(req). */
export async function verifyActingUser(actingUserId) {
  if (!actingUserId) return null;
  const supa = getServiceClient();
  const { data, error } = await supa
    .from('usuarios_painel')
    .select('id, nome, email, cargo, telefone, role, ativo, primeiro_login, created_at')
    .eq('id', actingUserId)
    .eq('ativo', true)
    .single();
  if (error || !data) return null;
  return data;
}
