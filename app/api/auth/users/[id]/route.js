import { NextResponse } from 'next/server';
import { getServiceClient, verifySession } from '../../../../../lib/authServer';

const ALLOWED_UPDATES = new Set(['nome', 'email', 'cargo', 'telefone', 'role']);

export async function PATCH(req, { params }) {
  try {
    const acting = await verifySession(req, ['admin']);
    if (!acting) return NextResponse.json({ error: 'Apenas administradores podem editar usuários.' }, { status: 403 });

    const body = await req.json();
    const updates = Object.fromEntries(Object.entries(body).filter(([key]) => ALLOWED_UPDATES.has(key)));
    if (updates.role && !['user', 'subadmin', 'admin'].includes(updates.role)) {
      return NextResponse.json({ error: 'Perfil inválido.' }, { status: 400 });
    }
    if (updates.email) updates.email = updates.email.toLowerCase().trim();

    const supa = getServiceClient();
    const { error } = await supa.from('usuarios_painel').update(updates).eq('id', params.id);
    if (error) return NextResponse.json({ error: 'Falha ao atualizar usuário.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[users:update]', err);
    return NextResponse.json({ error: 'Erro inesperado.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const acting = await verifySession(req, ['admin']);
    if (!acting) return NextResponse.json({ error: 'Apenas administradores podem excluir usuários.' }, { status: 403 });
    if (acting.id === params.id) return NextResponse.json({ error: 'Você não pode excluir o próprio usuário.' }, { status: 400 });

    const supa = getServiceClient();
    const { error } = await supa.from('usuarios_painel').delete().eq('id', params.id);
    if (error) return NextResponse.json({ error: 'Falha ao excluir usuário.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[users:delete]', err);
    return NextResponse.json({ error: 'Erro inesperado.' }, { status: 500 });
  }
}
