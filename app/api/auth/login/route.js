import { NextResponse } from 'next/server';
import { getServiceClient, comparePassword, attachSessionCookie } from '../../../../lib/authServer';

const attempts = globalThis.__premixLoginAttempts || new Map();
globalThis.__premixLoginAttempts = attempts;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function requestIp(req) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || req.headers.get('x-real-ip') || null;
}

function requestKey(req, email) {
  const ip = requestIp(req) || 'unknown';
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

/* Log de tentativas de login (sucesso e falha) — não bloqueia a resposta
   ao usuário se a gravação falhar (fire-and-forget). Alimenta a tela de
   auditoria/segurança da área de admin. */
async function logLoginAttempt(supa, { sucesso, email, nome, req }) {
  try {
    await supa.from('auditoria').insert({
      ator_nome: nome || email || 'desconhecido',
      ator_email: email || null,
      acao: sucesso ? 'login_sucesso' : 'login_falhou',
      tipo_cadastro: 'auth',
      cadastro_id: null,
      detalhes: {},
      ip: requestIp(req),
      user_agent: req.headers.get('user-agent') || null,
    });
  } catch (err) {
    console.warn('[logLoginAttempt]', err.message);
  }
}

export async function POST(req) {
  try {
    const { email, senha } = await req.json();
    if (!email || !senha) return NextResponse.json({ error: 'Informe e-mail e senha.' }, { status: 400 });

    const key = requestKey(req, email);
    const supa = getServiceClient();

    if (blocked(key)) {
      await logLoginAttempt(supa, { sucesso: false, email, req });
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
    }

    const { data: user, error } = await supa
      .from('usuarios_painel')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user || !user.ativo || !(await comparePassword(senha, user.senha_hash))) {
      registerFailure(key);
      await logLoginAttempt(supa, { sucesso: false, email, nome: user?.nome, req });
      return NextResponse.json({ error: 'E-mail ou senha inválidos.' }, { status: 401 });
    }

    attempts.delete(key);
    await logLoginAttempt(supa, { sucesso: true, email: user.email, nome: user.nome, req });
    const { senha_hash, ...safeUser } = user;
    return attachSessionCookie(NextResponse.json({ user: safeUser }), safeUser);
  } catch (err) {
    console.error('[login]', err);
    return NextResponse.json({ error: 'Erro inesperado ao entrar.' }, { status: 500 });
  }
}
