import { NextResponse } from 'next/server';
import { verifySession } from '../../../lib/authServer';

const TEMPLATE_ENV = {
  aprovado: ['EMAILJS_TEMPLATE_APROVADO', 'NEXT_PUBLIC_EMAILJS_TEMPLATE_APROVADO'],
  devolvido: ['EMAILJS_TEMPLATE_DEVOLVIDO', 'NEXT_PUBLIC_EMAILJS_TEMPLATE_DEVOLVIDO'],
  desbloqueio: ['EMAILJS_TEMPLATE_DESBLOQ', 'NEXT_PUBLIC_EMAILJS_TEMPLATE_DESBLOQ'],
};

function firstEnv(names) {
  for (const name of names) if (process.env[name]) return process.env[name];
  return '';
}

function sanitizeParams(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return Object.fromEntries(Object.entries(input).slice(0, 40).map(([key, value]) => [
    String(key).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 80),
    String(value ?? '').slice(0, 6000),
  ]));
}

export async function POST(req) {
  const user = await verifySession(req);
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  try {
    const { kind, params } = await req.json();
    if (!TEMPLATE_ENV[kind]) return NextResponse.json({ error: 'Modelo de e-mail inválido.' }, { status: 400 });

    const serviceId = process.env.EMAILJS_SERVICE || process.env.NEXT_PUBLIC_EMAILJS_SERVICE;
    const publicKey = process.env.EMAILJS_PUBLIC || process.env.NEXT_PUBLIC_EMAILJS_PUBLIC;
    const templateId = firstEnv(TEMPLATE_ENV[kind]);
    if (!serviceId || !publicKey || !templateId) {
      return NextResponse.json({ error: 'Configuração de e-mail incompleta.' }, { status: 503 });
    }

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: { ...sanitizeParams(params), operador_nome: user.nome, operador_email: user.email },
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      console.error('[email]', response.status, detail);
      return NextResponse.json({ error: 'O provedor de e-mail recusou o envio.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[email]', error);
    return NextResponse.json({ error: 'Falha inesperada ao enviar e-mail.' }, { status: 500 });
  }
}
