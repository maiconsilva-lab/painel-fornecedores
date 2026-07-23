import { NextResponse } from 'next/server';
import { getServiceClient, verifySession } from '../../../../../lib/authServer';

export async function POST(req) {
  try {
    const acting = await verifySession(req, ['admin']);
    if (!acting) return NextResponse.json({ error: 'Apenas administradores podem alterar acessos.' }, { status: 403 });
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Informe o usuário.' }, { status: 400 });
    if (acting.id === userId) return NextResponse.json({ error: 'Você não pode desativar o próprio usuário.' }, { status: 400 });

    const supa = getServiceClient();
    const { data: current, error: fetchErr } = await supa.from('usuarios_painel').select('ativo').eq('id', userId).single();
    if (fetchErr || !current) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

    const { error } = await supa.from('usuarios_painel').update({ ativo: !current.ativo }).eq('id', userId);
    if (error) return NextResponse.json({ error: 'Falha ao atualizar.' }, { status: 500 });
    return NextResponse.json({ ativo: !current.ativo });
  } catch (err) {
    console.error('[users:toggle-active]', err);
    return NextResponse.json({ error: 'Erro inesperado.' }, { status: 500 });
  }
}
