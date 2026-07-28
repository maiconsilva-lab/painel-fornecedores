import { NextResponse } from 'next/server';
import { getServiceClient, verifySession } from '../../../../../lib/authServer';

/* Consultada periodicamente por qualquer usuário logado (não só admin) —
   é assim que o participante descobre que o chat foi ativado pra ele,
   sem precisar de nenhuma notificação/realtime dedicado pra isso. */
export async function GET(req) {
  const user = await verifySession(req);
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const supa = getServiceClient();

  // Expira automaticamente qualquer sessão vencida (lazy expiry)
  await supa.from('chat_sessions').update({ ativo: false, desativado_em: new Date().toISOString() })
    .eq('ativo', true).lt('expira_em', new Date().toISOString());

  const { data, error } = await supa
    .from('chat_sessions')
    .select('id, channel_token, participantes, expira_em, criado_por')
    .eq('ativo', true)
    .gt('expira_em', new Date().toISOString())
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Falha ao consultar chat.' }, { status: 500 });
  if (!data || !Array.isArray(data.participantes) || !data.participantes.includes(user.id)) {
    return NextResponse.json({ session: null });
  }

  return NextResponse.json({
    session: { id: data.id, channelToken: data.channel_token, expiraEm: data.expira_em, criadoPor: data.criado_por },
  });
}
