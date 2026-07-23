import { NextResponse } from 'next/server';
import { getServiceClient, verifySession } from '../../../lib/authServer';

const SAFE_TYPES = new Set(['fornecedor', 'produto', 'desbloqueio', 'tarefa', 'usuario', 'sistema']);

export async function GET(req) {
  const user = await verifySession(req);
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const limit = Math.min(1000, Math.max(50, Number.parseInt(req.nextUrl.searchParams.get('limit') || '500', 10) || 500));
  const supa = getServiceClient();
  const { data, error } = await supa
    .from('auditoria')
    .select('id,created_at,ator_nome,ator_email,acao,tipo_cadastro,cadastro_id,detalhes')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[audit:get]', error);
    return NextResponse.json({ logs: [] }, { status: 200, headers: { 'Cache-Control': 'private, no-store' } });
  }
  return NextResponse.json({ logs: data || [] }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req) {
  const user = await verifySession(req);
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const acao = String(body.acao || '').trim().slice(0, 80);
  const tipoCadastro = SAFE_TYPES.has(body.tipo_cadastro) ? body.tipo_cadastro : 'sistema';
  const cadastroId = body.cadastro_id == null ? null : String(body.cadastro_id).slice(0, 120);
  if (!acao) return NextResponse.json({ error: 'Ação ausente.' }, { status: 400 });

  const supa = getServiceClient();
  const { error } = await supa.from('auditoria').insert({
    ator_nome: user.nome,
    ator_email: user.email,
    acao,
    tipo_cadastro: tipoCadastro,
    cadastro_id: cadastroId,
    detalhes: body.detalhes && typeof body.detalhes === 'object' ? body.detalhes : null,
  });

  if (error) {
    console.error('[audit]', error);
    return NextResponse.json({ error: 'Falha ao registrar auditoria.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
