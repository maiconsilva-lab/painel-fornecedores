import { NextResponse } from 'next/server';
import { getServiceClient, comparePassword, attachSessionCookie } from '../../../../lib/authServer';

const attempts = globalThis.__premixLoginAttempts || new Map();
globalThis.__premixLoginAttempts = attempts;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function requestKey(req, email) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || req.headers.get('x-real-ip') || 'unknown';
  return `${ip}:${String(email || '').toLowerCase().trim()}`;
}

function blocked(key) {
  const now = Date.now();
  const row = attempts.get(key);
  if (!row || now - row.first > WINDOW_MS) {
    attempts.set(key, { count: 0, first: now });
    return false;
  }
  return row.count >= MAX_ATTEMPTS;
}

function registerFailure(key) {
  const now = Date.now();
  const row = attempts.get(key);
  if (!row || now - row.first > WINDOW_MS) attempts.set(key, { count: 1, first: now });
  else attempts.set(key, { ...row, count: row.count + 1 });
}

export async function POST(req) {
  try {
    const { email, senha } = await req.json();
    if (!email || !senha) return NextResponse.json({ error: 'Informe e-mail e senha.' }, { status: 400 });

    const key = requestKey(req, email);
    if (blocked(key)) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
    }

    const supa = getServiceClient();
    const { data: user, error } = await supa
      .from('usuarios_painel')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user || !user.ativo || !(await comparePassword(senha, user.senha_hash))) {
      registerFailure(key);
      return NextResponse.json({ error: 'E-mail ou senha inválidos.' }, { status: 401 });
    }

    attempts.delete(key);
    const { senha_hash, ...safeUser } = user;
    return attachSessionCookie(NextResponse.json({ user: safeUser }), safeUser);
  } catch (err) {
    console.error('[login]', err);
    return NextResponse.json({ error: 'Erro inesperado ao entrar.' }, { status: 500 });
  }
}
