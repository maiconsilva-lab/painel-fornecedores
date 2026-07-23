import { NextResponse } from 'next/server';
import { getServiceClient, hashPassword, generateTempPassword, verifyActingUser } from '../../../../../lib/authServer';

export async function POST(req) {
  try {
    const { actingUserId, userId } = await req.json();
    const acting = await verifyActingUser(actingUserId);
    if (!acting) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    if (!userId) return NextResponse.json({ error: 'Informe o usuário.' }, { status: 400 });

    const tempPassword = generateTempPassword();
    const senha_hash = await hashPassword(tempPassword);

    const supa = getServiceClient();
    const { error } = await supa
      .from('usuarios_painel')
      .update({ senha_hash, primeiro_login: true })
      .eq('id', userId);

    if (error) return NextResponse.json({ error: 'Falha ao resetar senha.' }, { status: 500 });
    return NextResponse.json({ tempPassword });
  } catch (err) {
    console.error('[users:reset-password]', err);
    return NextResponse.json({ error: 'Erro inesperado.' }, { status: 500 });
  }
}
