import { NextResponse } from 'next/server';
import { getServiceClient, verifyActingUser } from '../../../../../lib/authServer';

export async function POST(req) {
  try {
    const { actingUserId, userId } = await req.json();
    const acting = await verifyActingUser(actingUserId);
    if (!acting) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    if (!userId) return NextResponse.json({ error: 'Informe o usuário.' }, { status: 400 });

    const supa = getServiceClient();
    const { data: current, error: fetchErr } = await supa
      .from('usuarios_painel')
      .select('ativo')
      .eq('id', userId)
      .single();
    if (fetchErr || !current) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

    const { error } = await supa
      .from('usuarios_painel')
      .update({ ativo: !current.ativo })
      .eq('id', userId);

    if (error) return NextResponse.json({ error: 'Falha ao atualizar.' }, { status: 500 });
    return NextResponse.json({ ativo: !current.ativo });
  } catch (err) {
    console.error('[users:toggle-active]', err);
    return NextResponse.json({ error: 'Erro inesperado.' }, { status: 500 });
  }
}
