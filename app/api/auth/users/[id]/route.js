import { NextResponse } from 'next/server';
import { getServiceClient, verifyActingUser } from '../../../../../lib/authServer';

export async function PATCH(req, { params }) {
  try {
    const { actingUserId, ...updates } = await req.json();
    const acting = await verifyActingUser(actingUserId);
    if (!acting) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    // Nunca aceitar troca de senha por essa rota — isso passa por
    // /api/auth/change-password (self) ou /api/auth/users/reset-password (admin).
    delete updates.senha_hash;

    const supa = getServiceClient();
    const { error } = await supa
      .from('usuarios_painel')
      .update(updates)
      .eq('id', params.id);

    if (error) return NextResponse.json({ error: 'Falha ao atualizar usuário.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[users:update]', err);
    return NextResponse.json({ error: 'Erro inesperado.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { actingUserId } = await req.json();
    const acting = await verifyActingUser(actingUserId);
    if (!acting) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const supa = getServiceClient();
    const { error } = await supa.from('usuarios_painel').delete().eq('id', params.id);

    if (error) return NextResponse.json({ error: 'Falha ao excluir usuário.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[users:delete]', err);
    return NextResponse.json({ error: 'Erro inesperado.' }, { status: 500 });
  }
}
