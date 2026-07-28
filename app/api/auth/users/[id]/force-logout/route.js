import { NextResponse } from 'next/server';
import { getServiceClient, verifySession } from '../../../../../../lib/authServer';

/* Invalida imediatamente qualquer sessão já aberta do usuário-alvo,
   incrementando session_epoch. Diferente de desativar a conta: a pessoa
   consegue logar de novo na hora, só é derrubada da sessão atual (útil
   se esqueceu aberto num computador da empresa, por exemplo). */
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const acting = await verifySession(req, ['admin']);
    if (!acting) return NextResponse.json({ error: 'Apenas administradores podem forçar logout.' }, { status: 403 });

    const supa = getServiceClient();
    const { data: target, error: fetchErr } = await supa
      .from('usuarios_painel')
      .select('session_epoch, nome')
      .eq('id', id)
      .single();
    if (fetchErr || !target) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

    const { error } = await supa
      .from('usuarios_painel')
      .update({ session_epoch: (target.session_epoch ?? 0) + 1 })
      .eq('id', id);
    if (error) return NextResponse.json({ error: 'Falha ao forçar logout.' }, { status: 500 });

    await supa.from('auditoria').insert({
      ator_nome: acting.nome, ator_email: acting.email,
      acao: 'forcou_logout', tipo_cadastro: 'auth', cadastro_id: id,
      detalhes: { usuario: target.nome },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[force-logout]', err);
    return NextResponse.json({ error: 'Erro inesperado.' }, { status: 500 });
  }
}
