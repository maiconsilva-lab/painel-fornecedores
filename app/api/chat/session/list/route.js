import { NextResponse } from 'next/server';
import { getServiceClient, verifySession } from '../../../../../lib/authServer';

export async function GET(req) {
  const acting = await verifySession(req, ['admin']);
  if (!acting) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const supa = getServiceClient();
  const { data: expiradas } = await supa
    .from('chat_sessions')
    .select('id')
    .eq('ativo', true)
    .lt('expira_em', new Date().toISOString());
  if (expiradas?.length) {
    const ids = expiradas.map((s) => s.id);
    await supa.from('chat_sessions').update({ ativo: false, desativado_em: new Date().toISOString() }).in('id', ids);
    await supa.from('chat_messages').delete().in('session_id', ids);
  }

  const { data, error } = await supa
    .from('chat_sessions')
    .select('id, participantes, ativo, criado_por, criado_em, expira_em, desativado_em')
    .order('criado_em', { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: 'Falha ao listar sessões.' }, { status: 500 });
  return NextResponse.json({ sessions: data });
}
