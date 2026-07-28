import { NextResponse } from 'next/server';
import { getServiceClient, verifySession } from '../../../../../../lib/authServer';

export async function POST(req, { params }) {
  const acting = await verifySession(req, ['admin']);
  if (!acting) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const supa = getServiceClient();
  const { error } = await supa
    .from('chat_sessions')
    .update({ ativo: false, desativado_em: new Date().toISOString() })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: 'Falha ao desativar.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
