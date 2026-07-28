import { NextResponse } from 'next/server';
import { getServiceClient, verifySession } from '../../../../../../lib/authServer';

export async function POST(req, { params }) {
  const { id } = await params;
  const acting = await verifySession(req, ['admin']);
  if (!acting) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const supa = getServiceClient();
  const { error } = await supa
    .from('chat_sessions')
    .update({ ativo: false, desativado_em: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: 'Falha ao desativar.' }, { status: 500 });

  // Ao desativar manualmente, some com qualquer mensagem pendente na hora
  // (em vez de esperar os 10 min de autodestruição individual).
  await supa.from('chat_messages').delete().eq('session_id', id);

  return NextResponse.json({ ok: true });
}
