import { NextResponse } from 'next/server';
import { getServiceClient, comparePassword, hashPassword, verifySession } from '../../../../lib/authServer';

export async function POST(req) {
  try {
    const sessionUser = await verifySession(req);
    if (!sessionUser) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const { senhaAtual, novaSenha } = await req.json();
    if (!senhaAtual || !novaSenha) return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    if (novaSenha.length < 8 || !/[A-Z]/.test(novaSenha) || !/[0-9]/.test(novaSenha)) {
      return NextResponse.json({ error: 'Use ao menos 8 caracteres, uma letra maiúscula e um número.' }, { status: 400 });
    }

    const supa = getServiceClient();
    const { data: user, error } = await supa
      .from('usuarios_painel')
      .select('id, senha_hash')
      .eq('id', sessionUser.id)
      .single();

    if (error || !user) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    if (!(await comparePassword(senhaAtual, user.senha_hash))) {
      return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 401 });
    }

    const novoHash = await hashPassword(novaSenha);
    const { error: updErr } = await supa
      .from('usuarios_painel')
      .update({ senha_hash: novoHash, primeiro_login: false })
      .eq('id', sessionUser.id);

    if (updErr) return NextResponse.json({ error: 'Falha ao salvar a nova senha.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[change-password]', err);
    return NextResponse.json({ error: 'Erro inesperado.' }, { status: 500 });
  }
}
