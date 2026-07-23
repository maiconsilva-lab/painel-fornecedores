import { NextResponse } from 'next/server';
import { getServiceClient, verifySession } from '../../../lib/authServer';

const SAFE_TYPES = new Set(['fornecedor', 'produto', 'desbloqueio']);

export async function POST(req) {
  const user = await verifySession(req);
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!SAFE_TYPES.has(body.tipo_cadastro) || !body.cadastro_id) {
    return NextResponse.json({ error: 'Cadastro inválido.' }, { status: 400 });
  }

  const campos = Array.isArray(body.campos_a_corrigir)
    ? body.campos_a_corrigir.map(v => String(v).slice(0, 120)).slice(0, 80)
    : [];

  const supa = getServiceClient();
  const { data, error } = await supa
    .from('tokens_correcao')
    .insert({
      tipo_cadastro: body.tipo_cadastro,
      cadastro_id: body.cadastro_id,
      gerado_por: user.nome,
      motivo: String(body.motivo || '').slice(0, 4000),
      campos_a_corrigir: campos,
    })
    .select('token')
    .single();

  if (error || !data?.token) {
    console.error('[correction-token]', error);
    return NextResponse.json({ error: 'Falha ao gerar token de correção.' }, { status: 500 });
  }
  return NextResponse.json({ token: data.token });
}
