import { NextResponse } from 'next/server';
import { getServiceClient, hashPassword, generateTempPassword, verifySession } from '../../../../../lib/authServer';

export async function POST(req) {
  try {
    const acting = await verifySession(req, ['admin']);
    if (!acting) return NextResponse.json({ error: 'Apenas administradores podem redefinir senhas.' }, { status: 403 });
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Informe o usuário.' }, { status: 400 });

    const tempPassword = generateTempPassword();
    const senha_hash = await hashPassword(tempPassword);
    const supa = getServiceClient();
    const { error } = await supa.from('usuarios_painel').update({ senha_hash, primeiro_login: true }).eq('id', userId);
    if (error) return NextResponse.json({ error: 'Falha ao resetar senha.' }, { status: 500 });
    return NextResponse.json({ tempPassword });
  } catch (err) {
    console.error('[users:reset-password]', err);
    return NextResponse.json({ error: 'Erro inesperado.' }, { status: 500 });
  }
}
