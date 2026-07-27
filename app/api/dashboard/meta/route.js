import { NextResponse } from 'next/server';
import { getServiceClient, verifySession } from '../../../../lib/authServer';

export async function POST(req) {
  const acting = await verifySession(req, ['admin']);
  if (!acting) return NextResponse.json({ error: 'Apenas administradores podem atualizar a meta.' }, { status: 403 });

  const { mes_referencia, meta_valor, carregado_valor } = await req.json();
  if (meta_valor == null || carregado_valor == null) {
    return NextResponse.json({ error: 'Informe meta e valor carregado.' }, { status: 400 });
  }

  const supa = getServiceClient();
  const { error } = await supa
    .from('dashboard_meta')
    .update({
      mes_referencia: mes_referencia || new Date().toISOString().slice(0, 7),
      meta_valor,
      carregado_valor,
      atualizado_por: acting.nome,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', 1);

  if (error) return NextResponse.json({ error: 'Falha ao salvar meta.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
