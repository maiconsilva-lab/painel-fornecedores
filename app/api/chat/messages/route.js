import { NextResponse } from 'next/server';
import { getServiceClient, verifySession } from '../../../../lib/authServer';

/* Confirma que o usuário é participante da sessão pedida, e que a sessão
   ainda está ativa e dentro do prazo. Retorna a sessão se ok, ou null. */
async function getSessionIfParticipant(supa, sessionId, userId) {
  const { data, error } = await supa
    .from('chat_sessions')
    .select('id, participantes, ativo, expira_em')
    .eq('id', sessionId)
    .single();
  if (error || !data) return null;
  if (!data.ativo || new Date(data.expira_em) < new Date()) return null;
  if (!Array.isArray(data.participantes) || !data.participantes.includes(userId)) return null;
  return data;
}

export async function GET(req) {
  const user = await verifySession(req);
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ error: 'Informe a sessão.' }, { status: 400 });

  const supa = getServiceClient();
  const session = await getSessionIfParticipant(supa, sessionId, user.id);
  if (!session) return NextResponse.json({ error: 'Sessão inválida ou você não participa dela.' }, { status: 403 });

  // Autodestruição: qualquer mensagem com mais de 10 min é apagada antes de responder.
  await supa.from('chat_messages').delete().eq('session_id', sessionId).lt('expira_em', new Date().toISOString());

  const { data, error } = await supa
    .from('chat_messages')
    .select('id, remetente_id, remetente_nome, texto, criado_em, expira_em')
    .eq('session_id', sessionId)
    .order('criado_em', { ascending: true });

  if (error) return NextResponse.json({ error: 'Falha ao buscar mensagens.' }, { status: 500 });
  return NextResponse.json({ messages: data });
}

export async function POST(req) {
  const user = await verifySession(req);
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const { sessionId, texto } = await req.json();
  if (!sessionId || !texto?.trim()) return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 });

  const supa = getServiceClient();
  const session = await getSessionIfParticipant(supa, sessionId, user.id);
  if (!session) return NextResponse.json({ error: 'Sessão inválida ou você não participa dela.' }, { status: 403 });

  const { data, error } = await supa
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      remetente_id: user.id,
      remetente_nome: user.nome,
      texto: texto.trim().slice(0, 2000),
    })
    .select('id, remetente_id, remetente_nome, texto, criado_em, expira_em')
    .single();

  if (error) return NextResponse.json({ error: 'Falha ao enviar mensagem.' }, { status: 500 });
  return NextResponse.json({ message: data });
}
