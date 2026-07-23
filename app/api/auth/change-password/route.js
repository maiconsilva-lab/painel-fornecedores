import { NextResponse } from 'next/server';
import { getServiceClient, comparePassword, hashPassword } from '../../../../lib/authServer';

export async function POST(req) {
  try {
    const { userId, senhaAtual, novaSenha } = await req.json();
    if (!userId || !senhaAtual || !novaSenha) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }
    if (novaSenha.length < 8) {
      return NextResponse.json({ error: 'A nova senha precisa ter pelo menos 8 caracteres.' }, { status: 400 });
    }

    const supa = getServiceClient();
    const { data: user, error } = await supa
      .from('usuarios_painel')
      .select('id, senha_hash')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const ok = await comparePassword(senhaAtual, user.senha_hash);
    if (!ok) {
      return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 401 });
    }

    const novoHash = await hashPassword(novaSenha);
    const { error: updErr } = await supa
      .from('usuarios_painel')
      .update({ senha_hash: novoHash, primeiro_login: false })
      .eq('id', userId);

    if (updErr) {
      return NextResponse.json({ error: 'Falha ao salvar a nova senha.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[change-password]', err);
    return NextResponse.json({ error: 'Erro inesperado.' }, { status: 500 });
  }
}
