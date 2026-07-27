import { NextResponse } from 'next/server';
import { getServiceClient, verifySession } from '../../../../lib/authServer';

/* Chamada periodicamente pelo client (a cada ~20s, junto com o polling
   que já existe) enquanto a aba está em foco. Atualiza last_seen_at do
   usuário logado — é isso que alimenta o indicador de "quem está online"
   na tela de Equipe. Sem WebSocket/realtime: é só "a última vez que o
   navegador confirmou presença", com uma margem de tolerância no cálculo
   de exibição (ver isOnline() no client). */
export async function POST(req) {
  const user = await verifySession(req);
  if (!user) return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });

  const supa = getServiceClient();
  const { error } = await supa
    .from('usuarios_painel')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: 'Falha ao atualizar presença.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
