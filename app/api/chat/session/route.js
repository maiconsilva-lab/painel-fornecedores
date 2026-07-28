import { NextResponse } from 'next/server';
import { getServiceClient, verifySession } from '../../../../lib/authServer';

const MAX_MINUTOS = 120;

/* Cria uma nova sessão de chat efêmero. Só admin. Nunca guarda mensagens
   — só metadados (quem participa, quando expira). As mensagens em si
   trafegam só via Supabase Realtime Broadcast, direto entre navegadores. */
export async function POST(req) {
  const acting = await verifySession(req, ['admin']);
  if (!acting) return NextResponse.json({ error: 'Apenas administradores podem ativar o chat.' }, { status: 403 });

  const { participantes, duracaoMinutos } = await req.json();
  if (!Array.isArray(participantes) || participantes.length === 0) {
    return NextResponse.json({ error: 'Selecione ao menos um participante.' }, { status: 400 });
  }
  const minutos = Math.min(Math.max(Number(duracaoMinutos) || MAX_MINUTOS, 1), MAX_MINUTOS);

  const supa = getServiceClient();

  // Desativa qualquer sessão anterior ainda ativa antes de criar uma nova
  await supa.from('chat_sessions').update({ ativo: false, desativado_em: new Date().toISOString() }).eq('ativo', true);

  const expiraEm = new Date(Date.now() + minutos * 60 * 1000).toISOString();
  const participantesComAdmin = Array.from(new Set([...participantes, acting.id]));

  const { data, error } = await supa
    .from('chat_sessions')
    .insert({
      criado_por: acting.nome,
      participantes: participantesComAdmin,
      expira_em: expiraEm,
    })
    .select('id, channel_token, expira_em, participantes')
    .single();

  if (error) return NextResponse.json({ error: 'Falha ao criar sessão de chat.' }, { status: 500 });
  return NextResponse.json({ session: data });
}
